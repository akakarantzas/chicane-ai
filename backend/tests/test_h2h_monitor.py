from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
import json
import sqlite3

import pytest

from app.services.h2h_logic import build_h2h_prediction
from app.services.h2h_monitor import (
    capture_prediction, database, main, monitoring_summary, record_forecast, settle_results, summary,
)
from app.services.h2h_schedule import RaceEvent


START = datetime(2026, 9, 26, 11, tzinfo=timezone.utc)
BEFORE = START - timedelta(days=1)
AFTER = START + timedelta(hours=5)
EVENT = RaceEvent(2026, 4, "Target Grand Prix", START)


def history():
    return [{"year": 2026, "round": number, "race": f"Race {number}",
             "race_date": f"2026-03-{number:02}", "abbreviation": driver,
             "position": position, "status": "Finished", "full_name": driver, "source": "jolpica"}
            for number in range(1, 4) for driver, position in (("NOR", 1), ("PIA", 4))]


def results(event=EVENT):
    return [{"year": event.year, "round": event.round, "race": event.name,
             "race_date": event.starts_at.date().isoformat(), "abbreviation": driver,
             "position": position, "status": "Finished", "source": "jolpica"}
            for driver, position in (("NOR", 1), ("PIA", 2))]


def prediction(data=None, pair=("NOR", "PIA"), event=EVENT):
    return build_h2h_prediction(history() if data is None else data, *pair, event.name, target_event=event)


def record(path, *, data=None, pair=("NOR", "PIA"), event=EVENT, now=BEFORE, payload=None):
    data = history() if data is None else data
    return record_forecast(payload or prediction(data, pair, event), data, event, *pair, now, path=path)


def test_first_forecast_is_immutable_reversed_pairs_deduplicate(tmp_path):
    path = tmp_path / "monitor.sqlite"
    first = record(path)
    reverse = record(path, pair=("PIA", "NOR"), now=BEFORE + timedelta(hours=1))
    assert first["status"] == "recorded"
    assert reverse["status"] == "already_recorded"
    assert reverse["record_id"] == first["record_id"]
    assert reverse["recorded_at"] == first["recorded_at"]
    assert reverse["matches_current"] is True
    changed = history()
    changed[0]["position"] = 20
    assert record(path, data=changed)["matches_current"] is False
    with database(path) as connection:
        saved = connection.execute("SELECT * FROM forecasts").fetchall()
        assert len(saved) == 1
        assert json.loads(saved[0]["prediction_json"])["driver1_score"] == prediction()["driver1_score"]
        assert len(json.loads(saved[0]["input_json"])) == 6
    with pytest.raises(sqlite3.IntegrityError, match="immutable"):
        with database(path, write=True) as connection:
            connection.execute("UPDATE forecasts SET driver1='HAM'")


def test_server_time_boundary_unknown_start_and_no_backfill(tmp_path):
    path = tmp_path / "monitor.sqlite"
    assert record(path, now=START)["reason"] == "race_already_started"
    assert record(path, now=AFTER)["status"] == "not_recorded"
    event = RaceEvent(2026, 4, "Unconfirmed", START, False)
    assert record(path, event=event)["reason"] == "unconfirmed_target_time"
    assert not path.exists()
    with pytest.raises(ValueError, match="aware"):
        record(path, now=BEFORE.replace(tzinfo=None))


def test_target_future_rows_are_not_archived_as_history(tmp_path):
    path = tmp_path / "monitor.sqlite"
    record(path, data=history() + results())
    with database(path) as connection:
        assert len(json.loads(connection.execute("SELECT input_json FROM forecasts").fetchone()[0])) == 6


def test_concurrent_requests_keep_one_record(tmp_path):
    path = tmp_path / "monitor.sqlite"
    with ThreadPoolExecutor(max_workers=4) as pool:
        answers = list(pool.map(lambda _: record(path), range(8)))
    assert sum(answer["status"] == "recorded" for answer in answers) == 1
    assert summary(path=path)["groups"][0]["overall"]["logged_pairs"] == 1


def test_restart_safe_pending_then_settlement_and_corrections(tmp_path):
    path = tmp_path / "monitor.sqlite"
    record(path)
    assert summary(path=path)["groups"][0]["overall"]["accuracy"] is None
    assert settle_results(results(), AFTER, path=path)["new_revisions"] == 1
    assert settle_results(results(), AFTER + timedelta(minutes=1), path=path)["new_revisions"] == 0
    report = summary(path=path)["groups"][0]
    assert report["overall"]["accuracy"] == 1
    assert report["race_macro_accuracy"] == 1
    corrected = results()
    corrected[0]["position"], corrected[1]["position"] = 2, 1
    assert settle_results(corrected, AFTER + timedelta(minutes=2), path=path)["new_revisions"] == 1
    report = summary(path=path)["groups"][0]
    assert report["overall"]["accuracy"] == 0
    assert report["result_revisions"] == 1
    # A correction back to the original outcome is a third revision, not ignored.
    assert settle_results(results(), AFTER + timedelta(minutes=3), path=path)["new_revisions"] == 1
    with database(path) as connection:
        assert connection.execute("SELECT count(*) FROM outcomes").fetchone()[0] == 3
        assert json.loads(connection.execute("SELECT prediction_json FROM forecasts").fetchone()[0])["predicted_winner"] == "NOR"
    with pytest.raises(sqlite3.IntegrityError, match="append only"):
        with database(path, write=True) as connection:
            connection.execute("DELETE FROM outcomes")


def test_stale_observations_cannot_revert_newer_outcomes(tmp_path):
    path = tmp_path / "monitor.sqlite"
    record(path)
    settle_results(results(), AFTER, path=path)
    # Same classification advances the observation watermark without an evidence revision.
    settle_results(results(), AFTER + timedelta(hours=2), path=path)
    wrong = results()
    wrong[0]["position"], wrong[1]["position"] = 2, 1
    answer = settle_results(wrong, AFTER + timedelta(hours=3), path=path,
                            source_times={"2026": (AFTER + timedelta(hours=1)).isoformat()})
    assert answer["new_revisions"] == 0
    assert summary(path=path)["groups"][0]["overall"]["accuracy"] == 1


@pytest.mark.parametrize("kind", ["too_early", "date_changed", "no_winner", "missing_driver", "missing_position", "no_results"])
def test_incomplete_or_unconfirmed_results_stay_pending(tmp_path, kind):
    path = tmp_path / "monitor.sqlite"
    record(path)
    data, now = results(), AFTER
    if kind == "too_early": now = START + timedelta(hours=3)
    if kind == "date_changed":
        for row in data: row["race_date"] = "2026-09-27"
    if kind == "no_winner": data[0]["status"] = "Running"
    if kind == "missing_driver": data = data[:1]
    if kind == "missing_position": data[1]["position"] = None
    if kind == "no_results": data = []
    assert settle_results(data, now, path=path)["new_revisions"] == 0
    assert summary(path=path)["groups"][0]["overall"]["pending_pairs"] == 1


@pytest.mark.parametrize("change,reason", [({"dns": True}, "did_not_start"), ({"dsq": True}, "disqualified"),
    ({"status": "Not classified"}, "unclassified"), ({"position": 1}, "equal_positions")])
def test_contract_exclusions_do_not_count_as_wrong_predictions(tmp_path, change, reason):
    path = tmp_path / "monitor.sqlite"
    record(path)
    data = results()
    data[1].update(change)
    settle_results(data, AFTER, path=path)
    overall = summary(path=path)["groups"][0]["overall"]
    assert overall["excluded_pairs"] == 1
    assert overall["decided_pairs"] == 0
    assert overall["accuracy"] is None
    with database(path) as connection:
        outcome = json.loads(connection.execute("SELECT outcome_json FROM outcomes").fetchone()[0])
        assert outcome["exclusion_reasons"] == [reason]


def test_abstentions_are_retained_and_measured_separately(tmp_path):
    path = tmp_path / "monitor.sqlite"
    record(path, data=history()[:2])
    settle_results(results(), AFTER, path=path)
    report = summary(path=path)["groups"][0]
    assert report["overall"]["abstention_rate"] == 1
    assert report["overall"]["eligible_pairs"] == 1
    assert report["overall"]["decision_coverage"] == 0
    assert report["overall"]["accuracy"] is None


def test_versions_remain_separate_and_trends_require_ten_scored_races(tmp_path):
    path = tmp_path / "monitor.sqlite"
    for i in range(10):
        event = RaceEvent(2026, 10 + i, f"Future Race {i}", START + timedelta(days=i))
        record(path, event=event)
        data = results(event)
        if i >= 5: data[0]["position"], data[1]["position"] = 2, 1
        settle_results(data, AFTER + timedelta(days=i), path=path)
    group = summary(path=path)["groups"][0]
    assert group["trend"]["previous_accuracy"] == 1
    assert group["trend"]["recent_accuracy"] == 0
    assert group["trend"]["change"] == -1
    new_version = prediction()
    new_version["model_version"] = "test-model-v2"
    record(path, payload=new_version)
    assert len(summary(path=path)["groups"]) == 2


def test_empty_store_read_does_not_create_database_and_failures_are_safe(tmp_path, monkeypatch):
    path = tmp_path / "monitor.sqlite"
    monkeypatch.setenv("H2H_MONITOR_DB_PATH", str(path))
    monkeypatch.setenv("H2H_MONITOR_ENABLED", "true")
    assert monitoring_summary()["status"] == "no_records"
    assert not path.exists()
    path.write_text("not a database")
    assert monitoring_summary()["status"] == "unavailable"
    assert capture_prediction(prediction(), history(), EVENT, "NOR", "PIA", BEFORE)["status"] == "unavailable"


def test_api_records_abstentions_and_read_only_summary(client, tmp_path, monkeypatch):
    from app.routers import h2h
    monkeypatch.setenv("H2H_MONITOR_ENABLED", "true")
    monkeypatch.setenv("H2H_MONITOR_DB_PATH", str(tmp_path / "monitor.sqlite"))
    def load(year, strict=True):
        return [{**row, "year": year, "race_date": f"{year}-03-{8 if row['round'] == 1 else 15:02}"}
                for row in history() if row["round"] <= 2]
    monkeypatch.setattr(h2h, "_load_results", load)
    response = client.get("/api/h2h/predict?driver1=NOR&driver2=PIA").json()
    assert response["monitoring"]["status"] == "recorded"
    assert response["model_version"] == "h2h-heuristic-v1"
    assert client.get("/api/h2h/predict?driver1=PIA&driver2=NOR").json()["monitoring"]["status"] == "already_recorded"
    assert client.get("/api/h2h/monitoring").json()["groups"][0]["overall"]["logged_pairs"] == 1


def test_slow_api_response_does_not_record_after_start(client, tmp_path, monkeypatch):
    from app.routers import h2h
    monkeypatch.setenv("H2H_MONITOR_ENABLED", "true")
    path = tmp_path / "monitor.sqlite"
    monkeypatch.setenv("H2H_MONITOR_DB_PATH", str(path))
    ticks = iter([BEFORE, START])
    monkeypatch.setattr(h2h, "utc_now", lambda: next(ticks))
    monkeypatch.setattr(h2h, "_load_results", lambda *args, **kwargs: [])
    result = client.get("/api/h2h/predict?driver1=NOR&driver2=PIA").json()
    assert result["monitoring"]["reason"] == "race_already_started"
    assert not path.exists()


def test_monitoring_disabled_and_cli_protects_missing_input(tmp_path, monkeypatch, capsys):
    monkeypatch.setenv("H2H_MONITOR_ENABLED", "false")
    assert monitoring_summary()["status"] == "disabled"
    assert capture_prediction(prediction(), history(), EVENT, "NOR", "PIA", BEFORE)["status"] == "disabled"
    path = tmp_path / "monitor.sqlite"
    assert main(["summary", "--db", str(path)]) == 0
    assert '"no_records"' in capsys.readouterr().out
    assert not path.exists()
    with pytest.raises(SystemExit): main(["settle", "--db", str(path)])


def test_race_macro_accuracy_does_not_overweight_races_with_more_requests(tmp_path):
    path = tmp_path / "monitor.sqlite"
    data = history() + [{**row, "abbreviation": "RUS", "position": 8}
                        for row in history() if row["abbreviation"] == "NOR"]
    for pair in (("NOR", "PIA"), ("NOR", "RUS"), ("PIA", "RUS")):
        record(path, data=data, pair=pair)
    outcome = results() + [{**results()[0], "abbreviation": "RUS", "position": 3}]
    settle_results(outcome, AFTER, path=path)
    second = RaceEvent(2026, 5, "Second", START + timedelta(days=7))
    record(path, event=second)
    wrong = results(second)
    wrong[0]["position"], wrong[1]["position"] = 2, 1
    settle_results(wrong, AFTER + timedelta(days=7), path=path)
    report = summary(path=path)["groups"][0]
    assert report["overall"]["accuracy"] == .75
    assert report["race_macro_accuracy"] == .5


def test_duplicate_results_fail_without_changing_saved_outcome(tmp_path):
    path = tmp_path / "monitor.sqlite"
    record(path)
    settle_results(results(), AFTER, path=path)
    with pytest.raises(ValueError, match="duplicate"):
        settle_results(results() + [results()[0]], AFTER + timedelta(hours=1), path=path)
    assert summary(path=path)["groups"][0]["overall"]["accuracy"] == 1


def test_capture_does_not_settle_stale_snapshots(tmp_path, monkeypatch):
    path = tmp_path / "monitor.sqlite"
    monkeypatch.setenv("H2H_MONITOR_ENABLED", "true")
    monkeypatch.setenv("H2H_MONITOR_DB_PATH", str(path))
    record(path)
    future = RaceEvent(2026, 5, "Next", START + timedelta(days=7))
    payload = prediction(event=future)
    payload["snapshots"] = {"2026": {"freshness": {"status": "stale", "retrieved_at": AFTER.isoformat()}}}
    capture_prediction(payload, history() + results(), future, "NOR", "PIA", AFTER)
    assert summary(path=path)["groups"][0]["overall"]["pending_pairs"] == 2


def test_cli_import_retains_export_timestamp_and_updates_summary(tmp_path, monkeypatch, capsys):
    from app.services import h2h_monitor
    class FixedTime(datetime):
        @classmethod
        def now(cls, tz=None):
            return AFTER + timedelta(hours=1)
    monkeypatch.setattr(h2h_monitor, "datetime", FixedTime)
    path, source = tmp_path / "monitor.sqlite", tmp_path / "results.json"
    record(path)
    source.write_text(json.dumps({"rows": results(), "provenance": {"completed_at": AFTER.isoformat()}}))
    assert main(["settle", "--db", str(path), "--input", str(source)]) == 0
    assert json.loads(capsys.readouterr().out)["new_revisions"] == 1
    with database(path) as connection:
        outcome = json.loads(connection.execute("SELECT outcome_json FROM outcomes").fetchone()[0])
        assert outcome["source_as_of"] == AFTER.isoformat()
    assert main(["summary", "--db", str(path)]) == 0
    assert json.loads(capsys.readouterr().out)["groups"][0]["overall"]["accuracy"] == 1


def test_unknown_rule_version_is_not_reinterpreted(tmp_path):
    path = tmp_path / "monitor.sqlite"
    payload = prediction()
    payload["rule_version"] = "different-finish-rules"
    record(path, payload=payload)
    assert settle_results(results(), AFTER, path=path)["new_revisions"] == 0
    assert summary(path=path)["groups"][0]["overall"]["pending_pairs"] == 1
