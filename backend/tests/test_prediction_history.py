from copy import deepcopy
from datetime import datetime, timedelta, timezone
import json
import sqlite3

import pytest

from app.services import prediction_history as history
from app.services.h2h_schedule import RaceEvent


START = datetime(2026, 10, 4, 7, tzinfo=timezone.utc)
BEFORE = START - timedelta(days=1)
AFTER = START + timedelta(hours=2)
EVENT = RaceEvent(2026, 16, "Bahrain Grand Prix", START)


def predictions():
    return [{"driver": "Norris", "team": "McLaren", "probability": .6},
            {"driver": "Russell", "team": "Mercedes", "probability": .3},
            {"driver": "Verstappen", "team": "Red Bull Racing", "probability": .1}]


def metadata():
    return {"race": "Bahrain GP", "circuit": "Test Circuit", "model_version": "test-v1",
            "generated_at": (BEFORE - timedelta(hours=1)).isoformat(),
            "prediction_input": {"grid_source": "projected_grid"}}


def published():
    return {"raceName": EVENT.name, "date": "2026-10-04", "round": "16", "Results": [
        {"position": str(index), "positionText": str(index), "status": "Finished", "points": str(points),
         "Time": {"millis": "6000000"}, "Driver": {"driverId": driver.lower(), "code": code,
         "givenName": first, "familyName": driver}, "Constructor": {"name": team}}
        for index, (driver, code, first, team, points) in enumerate([
            ("Russell", "RUS", "George", "Mercedes", 25),
            ("Norris", "NOR", "Lando", "McLaren", 18),
            ("Verstappen", "VER", "Max", "Red Bull Racing", 15),
        ], 1)]}


@pytest.fixture
def archive(monkeypatch, tmp_path):
    path = tmp_path / "history.sqlite"
    monkeypatch.setenv("PREDICTION_HISTORY_ENABLED", "true")
    monkeypatch.setenv("PREDICTION_HISTORY_DB_PATH", str(path))
    monkeypatch.setattr(history, "utc_now", lambda: BEFORE)
    monkeypatch.setattr(history, "get_season_schedule", lambda year: [EVENT])
    monkeypatch.setattr(history, "MODELS_DIR", tmp_path / "models")
    monkeypatch.setattr(history, "load_result_races", lambda year: [published()])
    return path


def save(path, *, data=None, meta=None, now=BEFORE):
    return history.record_forecast(predictions() if data is None else data,
                                   metadata() if meta is None else meta, now=now, event=EVENT, path=path)


def test_archive_preserves_each_update_and_deduplicates_repeated_reads(archive):
    first = save(archive)
    repeat = save(archive, now=BEFORE + timedelta(minutes=1))
    assert repeat == {"status": "already_recorded", "id": first["id"]}
    updated = predictions()
    updated[0]["probability"], updated[1]["probability"] = .3, .6
    post = {**metadata(), "generated_at": BEFORE.isoformat(),
            "prediction_input": {"grid_source": "qualifying_grid"}}
    second = save(archive, data=updated, meta=post, now=BEFORE + timedelta(hours=1))
    assert second["id"] != first["id"]
    rows = history.forecast_records(archive)
    assert len(rows) == 2
    assert json.loads(rows[0]["payload_json"])["predictions"] == predictions()
    with pytest.raises(sqlite3.IntegrityError, match="immutable"):
        with history.database(archive, write=True) as db:
            db.execute("UPDATE history_forecasts SET recorded_at='changed'")


@pytest.mark.parametrize("now", [START, AFTER])
def test_forecasts_first_seen_after_start_are_not_backfilled(archive, now):
    assert save(archive, now=now)["reason"] == "race_already_started"
    assert not archive.exists()


def test_unknown_start_and_future_generation_are_not_archived(archive):
    event = RaceEvent(EVENT.year, EVENT.round, EVENT.name, START, False)
    assert history.record_forecast(predictions(), metadata(), now=BEFORE, event=event, path=archive)["reason"] == "unconfirmed_race_start"
    with pytest.raises(ValueError, match="generation time"):
        save(archive, meta={**metadata(), "generated_at": (BEFORE + timedelta(hours=1)).isoformat()})
    assert not archive.exists()


def test_slow_calendar_lookup_cannot_cross_start_and_record_a_forecast(archive, monkeypatch):
    times = iter([BEFORE, START])
    monkeypatch.setattr(history, "utc_now", lambda: next(times))
    assert history.record_forecast(predictions(), metadata())["reason"] == "race_already_started"
    assert not archive.exists()


def test_results_only_appear_after_race_start_and_publication(archive):
    save(archive)
    def not_yet(year):
        pytest.fail("Future race results must not be requested")
    assert history.settle_results(path=archive, now=BEFORE, loader=not_yet) == 0
    assert history.read_history(path=archive, now=BEFORE) == {"races": [], "pending_count": 0}
    incomplete = published()
    incomplete["Results"] = incomplete["Results"][:1]
    assert history.settle_results(path=archive, now=AFTER, loader=lambda year: [incomplete]) == 0
    assert history.read_history(path=archive, now=AFTER) == {"races": [], "pending_count": 1}
    assert history.settle_results(path=archive, now=AFTER, loader=lambda year: [published()]) == 1
    card = history.read_history(path=archive, now=AFTER)["races"][0]
    assert card["race"] == EVENT.name
    assert card["actualWinner"] == "Russell"
    assert card["predictions"][0]["driver"] == "Norris"
    assert card["raceDate"] == "2026-10-04"
    assert len(card["actualResults"]) == 3
    assert card["resultSource"].endswith("/2026/16/results.json")
    assert history.read_history(path=archive, now=BEFORE)["races"] == []


@pytest.mark.parametrize("mutation", ["grid", "wrong_date", "wrong_race", "duplicate", "missing_time"])
def test_invalid_classifications_do_not_publish_history(archive, mutation):
    save(archive)
    race = published()
    if mutation == "grid":
        race["Results"][0]["status"] = "Running"
    elif mutation == "wrong_date":
        race["date"] = "2026-10-11"
    elif mutation == "wrong_race":
        race["raceName"] = "Singapore Grand Prix"
    elif mutation == "duplicate":
        race["Results"][1] = deepcopy(race["Results"][0])
    else:
        race["Results"][0].pop("Time")
    assert history.settle_results(path=archive, now=AFTER, loader=lambda year: [race]) == 0
    assert history.read_history(path=archive, now=AFTER)["races"] == []


def test_latest_pre_race_update_is_default_but_both_forecasts_remain(archive):
    save(archive)
    data = predictions()
    data[0]["probability"], data[1]["probability"] = .3, .6
    second = save(archive, data=data, meta={**metadata(), "generated_at": BEFORE.isoformat(),
                   "prediction_input": {"grid_source": "qualifying_grid"}}, now=BEFORE + timedelta(hours=1))
    history.settle_results(path=archive, now=AFTER, loader=lambda year: [published()])
    card = history.read_history(path=archive, now=AFTER)["races"][0]
    assert card["id"] == "2026:Race:16"
    assert len(card["forecasts"]) == 2
    assert card["forecasts"][0]["id"] == second["id"]
    assert card["predictions"][0]["driver"] == "Russell"
    assert card["status"] == "Post-Qualifying"


def test_las_vegas_local_date_matches_utc_start_only_with_same_round_and_identity(archive):
    start = datetime(2026, 11, 22, 6, tzinfo=timezone.utc)
    event = RaceEvent(2026, 21, "Las Vegas Grand Prix", start)
    meta = {**metadata(), "race": "Las Vegas GP"}
    history.record_forecast(predictions(), meta, now=start - timedelta(days=1), event=event, path=archive)
    race = {**published(), "raceName": event.name, "date": "2026-11-21", "round": "21"}
    assert history.settle_results(path=archive, now=start + timedelta(hours=2), loader=lambda year: [race]) == 1
    assert history.read_history(path=archive, now=start + timedelta(hours=2))["races"][0]["race"] == event.name
    assert not history.matches_event({**race, "round": "22"}, event.public())
    assert not history.matches_event({**race, "date": "2026-11-20"}, event.public())
    assert not history.matches_event({**race, "raceName": "Singapore Grand Prix"}, event.public())


def test_provider_failure_and_truncation_preserve_history_and_corrections_update_results(archive):
    save(archive)
    history.settle_results(path=archive, now=AFTER, loader=lambda year: [published()])
    original = history.forecast_records(archive)
    def failed(year):
        raise RuntimeError("provider offline")
    with pytest.raises(RuntimeError):
        history.settle_results(path=archive, now=AFTER, loader=failed)
    truncated = published()
    truncated["Results"].pop()
    history.settle_results(path=archive, now=AFTER + timedelta(minutes=1), loader=lambda year: [truncated])
    assert history.read_history(path=archive, now=AFTER)["races"][0]["actualWinner"] == "Russell"
    correction = published()
    correction["Results"][0]["Driver"], correction["Results"][1]["Driver"] = correction["Results"][1]["Driver"], correction["Results"][0]["Driver"]
    history.settle_results(path=archive, now=AFTER + timedelta(minutes=2), loader=lambda year: [correction])
    assert history.read_history(path=archive, now=AFTER)["races"][0]["actualWinner"] == "Norris"
    assert history.forecast_records(archive) == original


def test_missing_archive_does_not_create_database_or_fabricate_forecasts(archive):
    assert history.read_history(path=archive) == {"races": [], "pending_count": 0}
    assert not archive.exists()


def test_scanner_archives_without_prediction_page_visits_and_skips_publication_lock(archive):
    directory = history.MODELS_DIR
    directory.mkdir()
    (directory / "bahrain_metadata.json").write_text(json.dumps(metadata()), encoding="utf-8")
    (directory / "bahrain_predictions.json").write_text(json.dumps(predictions()), encoding="utf-8")
    lock = directory / ".prediction-publish.lock"
    lock.touch()
    assert history.scan_forecasts() == 0
    assert not archive.exists()
    lock.unlink()
    assert history.scan_forecasts() == 0
    assert len(history.forecast_records()) == 1
    assert history.scan_forecasts() == 0
    assert len(history.forecast_records()) == 1


def test_publish_cli_exports_pre_race_manifest_and_new_installation_can_import_it(archive, tmp_path, monkeypatch, capsys):
    pred_path, meta_path = tmp_path / "pred.json", tmp_path / "meta.json"
    pred_path.write_text(json.dumps(predictions()), encoding="utf-8")
    meta_path.write_text(json.dumps(metadata()), encoding="utf-8")
    exports = tmp_path / "exports"
    history.main(["capture", "--predictions", str(pred_path), "--metadata", str(meta_path), "--export-dir", str(exports)])
    assert json.loads(capsys.readouterr().out)["status"] == "recorded"
    manifest = json.loads(next(exports.glob("*.json")).read_text())
    other = tmp_path / "new-installation.sqlite"
    history.import_forecast(manifest, path=other, now=AFTER)
    history.settle_results(path=other, now=AFTER, loader=lambda year: [published()])
    assert history.read_history(path=other, now=AFTER)["races"][0]["predictions"] == predictions()
    manifest["recorded_at"] = AFTER.isoformat()
    with pytest.raises(ValueError, match="before race start"):
        history.import_forecast(manifest, path=other, now=AFTER)


def test_history_api_refreshes_released_results_and_preserves_saved_results_on_failure(archive, client, monkeypatch):
    save(archive)
    monkeypatch.setattr(history, "utc_now", lambda: AFTER)
    response = client.get("/api/predictions/history")
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert response.json()["status"] == "ready"
    assert response.json()["races"][0]["actualWinner"] == "Russell"
    def failed(year):
        raise RuntimeError("offline")
    monkeypatch.setattr(history, "load_result_races", failed)
    history.refresh_history(force=True)
    data = client.get("/api/predictions/history").json()
    assert data["status"] == "stale"
    assert data["races"][0]["actualWinner"] == "Russell"


def test_prediction_endpoint_captures_the_original_forecast(archive, client, monkeypatch):
    from app.routers import predictions as router
    monkeypatch.setattr(router, "_load_predictions", predictions)
    monkeypatch.setattr(router, "_load_metadata", metadata)
    assert client.get("/api/predictions/next-race").status_code == 200
    assert json.loads(history.forecast_records()[0]["payload_json"])["predictions"] == predictions()


def test_background_worker_refreshes_without_a_history_request(monkeypatch):
    calls = []
    class Stop:
        stopped = False
        def is_set(self):
            return self.stopped
        def wait(self, seconds):
            self.stopped = True
    monkeypatch.setattr(history, "refresh_history", lambda: calls.append(True))
    history.run_worker(Stop())
    assert calls == [True]
