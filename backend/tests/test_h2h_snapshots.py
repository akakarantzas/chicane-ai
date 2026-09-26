from copy import deepcopy

from app.routers import h2h
from app.services import h2h_cache
from app.services.h2h_quality import snapshot_quality


def test_compare_and_prediction_reuse_same_snapshot_and_only_load_each_season_once(client, monkeypatch, sample_h2h_rows):
    calls, standings_calls = [], []
    def loader(year, strict=True):
        calls.append((year, strict))
        return [{**row, "year": year} for row in sample_h2h_rows]
    monkeypatch.setattr(h2h, "_load_results", loader)
    original_standings = h2h._load_standings
    monkeypatch.setattr(h2h, "_load_standings", lambda year, *args: standings_calls.append(year) or original_standings(year, *args))
    compare = client.get("/api/h2h/compare?driver1=NOR&driver2=PIA").json()
    pin = compare["freshness"]["snapshot_id"]
    prediction = client.get(f"/api/h2h/predict?driver1=NOR&driver2=PIA&snapshot_id={pin}").json()
    assert prediction["snapshots"]["2026"]["freshness"]["snapshot_id"] == pin
    assert prediction["snapshots"]["2026"]["quality"] == compare["quality"]
    assert calls == [(2026, True), (2024, True), (2025, True)]
    assert standings_calls == [2026, 2024, 2025]
    assert client.get("/api/h2h/compare?driver1=PIA&driver2=NOR").json()["freshness"]["snapshot_id"] == pin
    assert len(calls) == 3


def test_prediction_first_and_comparison_share_current_season_cache(client, monkeypatch, sample_h2h_rows):
    monkeypatch.setattr(h2h, "_load_results", lambda year, **kwargs: [{**row, "year": year} for row in sample_h2h_rows])
    prediction = client.get("/api/h2h/predict?driver1=NOR&driver2=PIA").json()
    comparison = client.get("/api/h2h/compare?driver1=NOR&driver2=PIA").json()
    assert prediction["snapshots"]["2026"]["freshness"]["snapshot_id"] == comparison["freshness"]["snapshot_id"]


def test_invalid_pin_is_rejected_before_loading_historical_sources(client, monkeypatch):
    calls = []
    monkeypatch.setattr(h2h, "_load_results", lambda *args, **kwargs: calls.append(1) or [])
    response = client.get("/api/h2h/predict?driver1=NOR&driver2=PIA&snapshot_id=missing")
    assert response.status_code == 409
    assert "Compare" in response.json()["detail"]
    assert calls == []


def test_pin_preserves_prediction_inputs_after_newer_comparison_refresh(client, monkeypatch, sample_h2h_rows):
    clock = [0.0]
    monkeypatch.setattr(h2h_cache.time, "monotonic", lambda: clock[0])
    monkeypatch.setenv("H2H_CACHE_TTL_SECONDS", "10")
    data = deepcopy(sample_h2h_rows)
    monkeypatch.setattr(h2h, "_load_results", lambda year, **kwargs: [
        {**row, "year": year} for row in (data if year == 2026 else sample_h2h_rows)])
    old = client.get("/api/h2h/compare?driver1=NOR&driver2=PIA").json()
    pin = old["freshness"]["snapshot_id"]
    baseline = client.get(f"/api/h2h/predict?driver1=NOR&driver2=PIA&snapshot_id={pin}").json()
    data[0]["position"] = 20
    clock[0] = 11
    newer = client.get("/api/h2h/compare?driver1=NOR&driver2=PIA").json()
    assert newer["freshness"]["snapshot_id"] != pin
    # Historical evidence is unchanged; isolate the current-season pin.
    pinned = client.get(f"/api/h2h/predict?driver1=NOR&driver2=PIA&snapshot_id={pin}").json()
    assert pinned["driver1_recent_form"] == baseline["driver1_recent_form"]
    assert pinned["h2h_record"] == baseline["h2h_record"]


def test_quality_distinguishes_no_record_from_excluded_result_and_reports_provenance():
    snapshot = {"coverage": {"expected_rounds": [1, 2, 3]}, "rows": [
        {"abbreviation": "NOR", "round": 1, "position": 2, "source": "jolpica", "conflicting_sources": ["fastf1"]},
        {"abbreviation": "NOR", "round": 2, "position": 1, "dns": True, "source": "openf1", "identity_basis": "driver_code"},
        {"abbreviation": "PIA", "round": 1, "position": 3, "source": "fastf1"},
    ]}
    quality = snapshot_quality(snapshot, ("NOR", "PIA"))
    assert quality["drivers"]["NOR"] == {"observed_rounds": [1, 2], "eligible_rounds": [1],
                                           "no_result_rounds": [3], "excluded_result_count": 1}
    assert quality["drivers"]["PIA"]["no_result_rounds"] == [2, 3]
    assert quality["selected_source_counts"] == {"jolpica": 1, "openf1": 1, "fastf1": 1}
    assert quality["conflicting_result_count"] == quality["code_only_identity_count"] == 1


def test_missing_historical_schedule_is_reported_without_hiding_other_years(client, monkeypatch, sample_h2h_rows):
    from fastapi import HTTPException
    original = h2h.get_season_schedule
    def schedule(year):
        if year == 2024:
            raise HTTPException(502, "Unavailable calendar")
        return original(year)
    monkeypatch.setattr(h2h, "get_season_schedule", schedule)
    monkeypatch.setattr(h2h, "_load_results", lambda year, **kwargs: [{**row, "year": year} for row in sample_h2h_rows])
    data = client.get("/api/h2h/predict?driver1=NOR&driver2=PIA").json()
    assert data["snapshots"]["2024"]["freshness"]["status"] == "unavailable"
    assert data["snapshots"]["2026"]["freshness"]["status"] == "fresh"
