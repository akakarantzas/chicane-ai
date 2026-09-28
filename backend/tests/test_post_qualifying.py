import copy
import json
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from app.services import post_qualifying as pq, qualifying_results as qr
from app.services.h2h_schedule import RaceEvent

NOW = datetime(2026, 10, 10, 14, tzinfo=timezone.utc)
EVENT = RaceEvent(2026, 17, "Singapore Grand Prix", datetime(2026, 10, 11, 12, tzinfo=timezone.utc))


@pytest.fixture
def artifacts():
    def read(suffix):
        return json.loads((pq.MODELS_DIR / f"singapore_{suffix}.json").read_text(encoding="utf-8"))
    return read("predictions"), read("metadata"), read("inference")


@pytest.fixture
def setup_refresh(monkeypatch, tmp_path, artifacts):
    predictions, metadata, bundle = artifacts
    monkeypatch.setenv("POST_QUALIFYING_ENABLED", "true")
    monkeypatch.setenv("PREDICTION_HISTORY_ENABLED", "true")
    monkeypatch.setenv("PREDICTION_HISTORY_DB_PATH", str(tmp_path / "history.sqlite"))
    monkeypatch.setattr(pq, "utc_now", lambda: NOW)
    monkeypatch.setattr(pq.history, "utc_now", lambda: NOW)
    monkeypatch.setattr(pq.history, "resolve_event", lambda *args: EVENT)
    grid = {row["DriverCode"]: index for index, row in enumerate(bundle["rows"], 1)}
    result = {"positions": grid, "session": "Qualifying", "source_url": "https://www.formula1.com/example"}
    monkeypatch.setattr(pq, "completed_qualifying", lambda *args: copy.deepcopy(result))
    changed = copy.deepcopy(predictions)
    changed[0]["probability"], changed[1]["probability"] = changed[1]["probability"], changed[0]["probability"]
    changed.sort(key=lambda row: row["probability"], reverse=True)
    monkeypatch.setattr(pq, "infer", lambda *args: changed if len(args) == 4 else predictions)
    return result


def test_saved_bundle_reproduces_baseline_and_accepts_qualifying(artifacts):
    predictions, metadata, bundle = artifacts
    path = pq.MODELS_DIR / "singapore_model.pkl"
    assert bundle["base_hash"] == pq.digest([predictions, metadata])
    assert pq.infer(bundle, path, metadata) == predictions
    grid = {row["DriverCode"]: index for index, row in enumerate(bundle["rows"], 1)}
    updated = pq.infer(bundle, path, metadata, grid)
    assert updated != predictions
    assert len(updated) == 22
    assert sum(row["probability"] for row in updated) == pytest.approx(1, abs=.001)
    assert bundle["rows"][0]["GridPosition"] == 3  # Frozen pre-qualifying features are unchanged.


@pytest.mark.parametrize("field,value", [("model_sha256", "invalid"), ("sklearn_version", "0.0")])
def test_incompatible_model_rejected(artifacts, field, value):
    _, metadata, bundle = artifacts
    bundle[field] = value
    with pytest.raises(ValueError):
        pq.infer(bundle, pq.MODELS_DIR / "singapore_model.pkl", metadata)


def test_publication_archives_both_stages_and_is_idempotent(setup_refresh, artifacts):
    predictions, metadata, _ = artifacts
    assert pq.refresh() == "published"
    update = pq.read_update(predictions, metadata)
    assert update["metadata"]["prediction_input"]["grid_basis"] == "qualifying_classification"
    assert update["predictions"] != predictions
    with pq.history.database() as connection:
        records = connection.execute("SELECT payload_json FROM history_forecasts").fetchall()
    assert {json.loads(row[0])["status"] for row in records} == {"Pre-Qualifying", "Post-Qualifying"}
    assert pq.refresh() == "unchanged"
    # Read again without relying on in-memory state (as a restarted API would).
    assert pq.read_update(predictions, metadata) == update
    changed_meta = {**metadata, "model_version": "new-model"}
    assert pq.read_update(predictions, changed_meta) is None


def test_revised_classification_publishes_new_forecast_once(setup_refresh, artifacts, monkeypatch):
    assert pq.refresh() == "published"
    setup_refresh["positions"]["NOR"], setup_refresh["positions"]["PIA"] = 2, 1
    later = NOW + timedelta(minutes=1)
    monkeypatch.setattr(pq, "utc_now", lambda: later)
    monkeypatch.setattr(pq.history, "utc_now", lambda: later)
    assert pq.refresh() == "published"
    assert pq.refresh() == "unchanged"
    with pq.history.database() as connection:
        assert connection.execute("SELECT COUNT(*) FROM history_forecasts").fetchone()[0] == 3


def test_pending_and_provider_failure_preserve_last_forecast(setup_refresh, artifacts, monkeypatch):
    predictions, metadata, _ = artifacts
    monkeypatch.setattr(pq, "completed_qualifying", lambda *args: None)
    assert pq.refresh() == "waiting_for_qualifying"
    assert pq.read_update(predictions, metadata) is None
    monkeypatch.setattr(pq, "completed_qualifying", lambda *args: setup_refresh)
    assert pq.refresh() == "published"
    previous = pq.read_update(predictions, metadata)
    def fail(*args):
        raise OSError("Provider unavailable")
    monkeypatch.setattr(pq, "completed_qualifying", fail)
    with pytest.raises(OSError):
        pq.refresh()
    assert pq.read_update(predictions, metadata) == previous


@pytest.mark.parametrize("offset,status", [(timedelta(), "closed"), (timedelta(days=-5), "waiting_for_weekend")])
def test_no_fetch_outside_publication_window(setup_refresh, monkeypatch, offset, status):
    monkeypatch.setattr(pq, "utc_now", lambda: EVENT.starts_at + offset)
    monkeypatch.setattr(pq, "completed_qualifying", lambda *args: pytest.fail("Unexpected provider fetch"))
    assert pq.refresh() == status


def test_slow_inference_crossing_race_start_cannot_publish(setup_refresh, artifacts, monkeypatch):
    predictions, metadata, _ = artifacts
    times = iter([NOW, EVENT.starts_at])
    monkeypatch.setattr(pq, "utc_now", lambda: next(times))
    assert pq.refresh() == "closed"
    assert not pq.update_path(predictions, metadata).exists()


def test_bad_grid_cannot_publish(setup_refresh, artifacts):
    setup_refresh["positions"].pop("NOR")
    with pytest.raises(ValueError):
        pq.refresh()
    assert not pq.update_path(*artifacts[:2]).exists()


def test_json_api_serves_published_stage_without_loading_model(setup_refresh, artifacts, monkeypatch, client):
    assert pq.refresh() == "published"
    monkeypatch.setattr("joblib.load", lambda *args: pytest.fail("API loaded model"))
    response = client.get("/api/predictions/next-race")
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert response.json()["status"] == "Post-Qualifying"
    assert response.json()["automatic_update_enabled"] is True
    assert response.json()["predictions"] == pq.read_update(*artifacts[:2])["predictions"]


def test_corrupt_update_falls_back_to_baseline(setup_refresh, artifacts, client):
    assert pq.refresh() == "published"
    pq.update_path(*artifacts[:2]).write_text("broken", encoding="utf-8")
    assert client.get("/api/predictions/next-race").json()["status"] == "Pre-Qualifying"


def page(rows, heading="Singapore Grand Prix 2026 - Qualifying"):
    cells = "".join("<tr>" + "".join(f"<td>{cell}</td>" for cell in row) + "</tr>" for row in rows)
    return f"<h1>{heading}</h1><table>{cells}</table>"


@pytest.fixture
def table(artifacts):
    return [[str(i), str(i), row["driver"] + " " + row["DriverCode"], row["TeamName"], "1:43.1", "", "", "5"]
            for i, row in enumerate(artifacts[2]["rows"], 1)]


def test_official_table_supports_eliminated_drivers_and_nested_markup(table, artifacts):
    table[0][2] = "Lando <span>Norris</span><span>NOR</span>"
    assert qr.parse_classification(page(table), EVENT, artifacts[2]["rows"])["NOR"] == 1


@pytest.mark.parametrize("damage", ["partial", "duplicate_position", "unknown_driver", "duplicate_driver", "team_change", "unclassified"])
def test_bad_classification_rejected(table, artifacts, damage):
    if damage == "partial": table.pop()
    if damage == "duplicate_position": table[1][0] = "1"
    if damage == "unknown_driver": table[1][2] = "Reserve RES"
    if damage == "duplicate_driver": table[1][2] = table[0][2]
    if damage == "team_change": table[1][3] = "Mercedes"
    if damage == "unclassified": table[1][0] = "NC"
    with pytest.raises(ValueError):
        qr.parse_classification(page(table), EVENT, artifacts[2]["rows"])


@pytest.mark.parametrize("heading", ["Singapore Grand Prix 2026 Sprint Qualifying", "Azerbaijan Grand Prix 2026 Qualifying", "Singapore Grand Prix 2025 Qualifying"])
def test_wrong_session_page_rejected(table, artifacts, heading):
    with pytest.raises(ValueError):
        qr.parse_classification(page(table, heading), EVENT, artifacts[2]["rows"])


@pytest.mark.parametrize("complete", [False, True])
def test_completion_gate_before_fetching_positions(monkeypatch, table, artifacts, complete):
    session = SimpleNamespace(name="Qualifying", date=NOW - timedelta(hours=2), api_path="/static/test/",
                              event=SimpleNamespace(EventName=EVENT.name, get_session_date=lambda *args, **kwargs: EVENT.starts_at))
    monkeypatch.setattr("fastf1.get_session", lambda year, name, identifier: session if identifier == "Q" else pytest.fail("Wrong session"))
    urls = []
    def fetch(url):
        urls.append(url)
        if url.endswith("ArchiveStatus.json"):
            return json.dumps({"Status": "Complete" if complete else "Generating"})
        if url.endswith("/races"):
            return '<a href="/en/results/2026/races/1296/singapore/race-result">Singapore</a>'
        return page(table)
    monkeypatch.setattr(qr, "fetch_text", fetch)
    result = qr.completed_qualifying(EVENT, artifacts[2]["rows"], NOW)
    assert len(urls) == (3 if complete else 1)
    assert (result is not None) == complete


def test_worker_retries_without_discarding_updates(monkeypatch):
    calls = []
    class Stop:
        def is_set(self): return len(calls) == 2
        def wait(self, seconds): assert seconds == 60
    def refresh():
        calls.append(1)
        if len(calls) == 1: raise OSError("Temporary failure")
        return "unchanged"
    monkeypatch.setattr(pq, "refresh", refresh)
    pq.run_worker(Stop())
    assert len(calls) == 2
