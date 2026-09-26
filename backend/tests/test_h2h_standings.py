from datetime import datetime, timezone

import pytest
from fastapi import HTTPException

from app.routers import h2h
from app.services.h2h_contract import published_points
from app.services.h2h_logic import build_stats
from app.services.h2h_standings import load_standings, unavailable_standings


NOW = datetime(2026, 9, 25, tzinfo=timezone.utc)


@pytest.fixture
def payload():
    # Synthetic complete two-driver championship, including sprint/adjustment
    # points that cannot be reconstructed from the GP result fixture alone.
    return {"MRData": {"total": "2", "offset": "0", "StandingsTable": {
        "season": "2026", "StandingsLists": [{"season": "2026", "round": "2", "DriverStandings": [
            {"Driver": {"code": "NOR", "driverId": "norris"},
             "position": "2", "positionText": "2", "points": "50"},
            {"Driver": {"code": "PIA", "driverId": "piastri"},
             "position": "1", "positionText": "1", "points": "50"},
        ]}],
    }}}


def load(payload, *, date="2026-03-15", provider_round=2, now=NOW):
    def fetch(url):
        if "/driverstandings.json" in url:
            return payload
        assert f"/2026/{provider_round}/races.json?limit=100" in url
        return {"MRData": {"RaceTable": {"Races": [
            {"season": "2026", "round": str(provider_round), "date": date},
        ]}}}
    return load_standings(2026, h2h.get_season_schedule(2026), now, fetch)


def test_published_totals_and_tie_breaks_are_not_inferred_from_race_only_points(payload, sample_h2h_rows):
    snapshot = load(payload)
    assert snapshot["status"] == "available"
    assert snapshot["through_event"]["race"] == "China"
    first = build_stats(sample_h2h_rows, "NOR", standings=snapshot)
    second = build_stats(sample_h2h_rows, "PIA", standings=snapshot)
    assert first["points"] == second["points"] == 50
    assert first["gp_points"] == 37
    assert second["gp_points"] == 43
    assert first["champ_position"] == 2
    assert second["champ_position"] == 1
    assert first["wins"] == second["wins"] == 1


def test_standings_map_provider_round_by_date_not_calendar_number(payload):
    payload["MRData"]["StandingsTable"]["StandingsLists"][0]["round"] = "4"
    assert load(payload, provider_round=4)["through_event"]["round"] == 2


def test_stale_standings_do_not_supply_current_totals(payload, sample_h2h_rows):
    payload["MRData"]["StandingsTable"]["StandingsLists"][0]["round"] = "1"
    snapshot = load(payload, date="2026-03-08", provider_round=1)
    assert snapshot["status"] == "stale"
    assert snapshot["through_event"]["round"] == 1
    assert snapshot["drivers"] == {}
    stats = build_stats(sample_h2h_rows, "NOR", standings=snapshot)
    assert stats["points"] is stats["champ_position"] is None


@pytest.mark.parametrize("date", ["2026-09-26", "2026-03-16", "invalid"])
def test_future_unmatched_and_invalid_dates_are_not_published_as_current(payload, date):
    assert load(payload, date=date)["status"] == "unavailable"


@pytest.mark.parametrize("changes", [{"total": "3"}, {"offset": "1"}])
def test_truncated_or_offset_standings_are_rejected(payload, changes):
    payload["MRData"].update(changes)
    assert load(payload)["status"] == "unavailable"


def test_wrong_season_is_rejected(payload):
    payload["MRData"]["StandingsTable"]["StandingsLists"][0]["season"] = "2025"
    assert load(payload)["status"] == "unavailable"


@pytest.mark.parametrize("changes", [
    {"points": None}, {"points": "nan"}, {"position": "0"}, {"position": "99"},
    {"position": "1"}, {"Driver": {"code": "PIA", "driverId": "norris"}},
    {"Driver": {"code": "NOR", "driverId": "piastri"}},
    {"Driver": {"code": "NOR"}},
])
def test_malformed_and_ambiguous_entries_do_not_return_a_partial_table(payload, changes):
    payload["MRData"]["StandingsTable"]["StandingsLists"][0]["DriverStandings"][0].update(changes)
    assert load(payload)["status"] == "unavailable"


def test_missing_rank_for_excluded_championship_driver_is_not_invented(payload):
    entry = payload["MRData"]["StandingsTable"]["StandingsLists"][0]["DriverStandings"][0]
    entry.update({"position": "2", "positionText": "D", "points": "0"})
    snapshot = load(payload)
    assert snapshot["status"] == "available"
    assert snapshot["drivers"]["NOR"]["champ_position"] is None
    assert snapshot["drivers"]["NOR"]["points"] == 0


def test_no_results_due_does_not_fetch_a_future_table():
    result = load_standings(2026, h2h.get_season_schedule(2026),
                            datetime(2026, 1, 1, tzinfo=timezone.utc),
                            lambda url: pytest.fail("No standings should be requested"))
    assert result == unavailable_standings("no_results_due")


def test_source_failure_is_unavailable_and_is_retried(payload):
    def failed(url):
        raise TimeoutError("offline")
    assert load_standings(2026, h2h.get_season_schedule(2026), NOW, failed)["status"] == "unavailable"
    assert load(payload)["status"] == "available"


@pytest.mark.parametrize("value", [None, "", "\\N", True, False, -1, "NaN", float("inf"), "bad"])
def test_unknown_or_invalid_points_are_never_zero(value):
    assert published_points(value) is None
    assert h2h._normalise_points(value) is None


@pytest.mark.parametrize("value,expected", [(0, 0), ("0", 0), ("12.5", 12.5), (25, 25)])
def test_zero_and_fractional_published_points_are_preserved(value, expected):
    assert published_points(value) == expected


def gp(**changes):
    return {"year": 2026, "round": 1, "race": "Australia", "abbreviation": "NOR",
            "position": 1, "status": "Finished", "points": 25, "driver_id": "norris",
            "session_type": "Race", **changes}


def test_finish_metrics_exclude_dns_dsq_unclassified_and_sprints_but_keep_retirements():
    rows = [gp(), gp(round=2, position=17, status="Engine", points=0),
            gp(round=3, position=2, status="Did not start", points=0),
            gp(round=4, position=1, status="Disqualified", points=0),
            gp(round=5, position=3, classified_position="N", points=0),
            gp(round=6, position=1, session_type="Sprint", points=8)]
    stats = build_stats(rows, "NOR")
    assert stats["races"] == 5  # Explicitly result entries, not starts/completions.
    assert stats["wins"] == stats["podiums"] == 1
    assert stats["best_finish"] == 1
    assert stats["avg_finish"] == 9
    assert stats["finish_sample_size"] == 2
    assert stats["excluded_results"] == 3
    assert stats["gp_points"] == 25


def test_missing_finish_cannot_be_counted_as_zero_wins_or_podiums():
    stats = build_stats([gp(position=None)], "NOR")
    assert stats["wins"] is stats["podiums"] is stats["best_finish"] is stats["avg_finish"] is None
    assert stats["stats_status"] == "partial"
    assert stats["finish_sample_size"] == 0


def test_no_driver_results_remain_unknown_instead_of_zero():
    stats = build_stats([], "NOR")
    for key in ("wins", "podiums", "points", "gp_points", "races", "champ_position", "avg_finish"):
        assert stats[key] is None
    assert stats["stats_status"] == "unavailable"


def test_known_zero_results_differ_from_missing_data():
    stats = build_stats([gp(position=15, points=0)], "NOR")
    assert stats["wins"] == stats["podiums"] == stats["gp_points"] == 0
    assert stats["races"] == 1


@pytest.mark.parametrize("changes", [{"points": None}, {"points": float("nan")}, {"points": 0, "points_available": False}])
def test_unknown_points_do_not_make_a_partial_total_look_complete(changes):
    stats = build_stats([gp(), gp(round=2, **changes)], "NOR")
    assert stats["gp_points"] is None
    assert stats["points"] is None


def test_standings_identity_conflict_is_not_attached_by_code_alone(payload):
    stats = build_stats([gp(driver_id="different_driver")], "NOR", standings=load(payload))
    assert stats["championship_status"] == "identity_conflict"
    assert stats["points"] is stats["champ_position"] is None


def test_published_standings_can_be_available_without_gp_rows(payload):
    stats = build_stats([], "NOR", standings=load(payload))
    assert stats["points"] == 50
    assert stats["champ_position"] == 2
    assert stats["wins"] is stats["races"] is None


def test_compare_uses_published_totals_and_keeps_other_seasons_out(client, monkeypatch, payload, sample_h2h_rows):
    snapshot = load(payload)
    monkeypatch.setattr(h2h, "_load_standings", lambda *args: snapshot)
    monkeypatch.setattr(h2h, "_load_results", lambda *args, **kwargs: sample_h2h_rows + [gp(year=2025)])
    response = client.get("/api/h2h/compare?driver1=NOR&driver2=PIA&year=2026")
    assert response.status_code == 200
    data = response.json()
    assert data["driver1"]["points"] == 50
    assert data["driver1"]["champ_position"] == 2
    assert data["driver1"]["races"] == 2
    assert data["standings"]["through_event"]["race"] == "China"
    assert "drivers" not in data["standings"]


def test_compare_does_not_invent_a_rank_or_total_when_standings_fail(client, monkeypatch, sample_h2h_rows):
    monkeypatch.setattr(h2h, "_load_results", lambda *args, **kwargs: sample_h2h_rows)
    data = client.get("/api/h2h/compare?driver1=NOR&driver2=PIA").json()
    assert data["standings"]["status"] == "unavailable"
    assert data["driver1"]["points"] is data["driver1"]["champ_position"] is None
    assert data["driver1"]["wins"] == 1


def test_result_failure_does_not_hide_valid_standings(client, monkeypatch, payload):
    monkeypatch.setattr(h2h, "_load_standings", lambda *args: load(payload))
    def failed(*args, **kwargs):
        raise HTTPException(502, "Results unavailable")
    monkeypatch.setattr(h2h, "_load_results", failed)
    response = client.get("/api/h2h/compare?driver1=NOR&driver2=PIA")
    assert response.status_code == 200
    assert response.json()["driver1"]["points"] == 50
    assert response.json()["driver1"]["wins"] is None
    assert response.json()["coverage"]["missing_rounds"] == [1, 2]


def test_prediction_does_not_fetch_standings_or_include_sprint_points(client, monkeypatch, sample_h2h_rows):
    monkeypatch.setattr(h2h, "_load_results", lambda year, **kwargs: [
        {**row, "year": year} for row in sample_h2h_rows])
    monkeypatch.setattr(h2h, "_load_standings", lambda *args: pytest.fail("Prediction does not use standings"))
    assert client.get("/api/h2h/predict?driver1=NOR&driver2=PIA").status_code == 200
