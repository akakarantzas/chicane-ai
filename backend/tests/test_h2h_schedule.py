from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from urllib.parse import parse_qs, urlparse

import pandas as pd
import pytest
from fastapi import HTTPException

from app.routers import h2h
from app.services import h2h_schedule as schedules
from app.services.h2h_schedule import RaceEvent, next_race, race_coverage

UTC = timezone.utc
NOW = datetime(2026, 9, 25, 12, tzinfo=UTC)


def event(number, starts_at, name=None, time_confirmed=True):
    return RaceEvent(2026, number, name or f"Grand Prix {number}", starts_at, time_confirmed)


def published_row(number):
    return {"abbreviation": "NOR", "year": 2026, "race": f"GP {number}", "round": number, "position": 1}


def test_next_race_uses_utc_start_time_not_the_last_loaded_result():
    past = event(1, NOW - timedelta(days=10))
    upcoming = event(2, NOW + timedelta(days=1))
    later = event(3, NOW + timedelta(days=15))
    assert next_race([later, past, upcoming], NOW) == (upcoming, "scheduled")
    assert next_race([past, upcoming, later], upcoming.starts_at) == (later, "scheduled")


def test_no_upcoming_race_after_final_start():
    assert next_race([event(1, NOW - timedelta(days=1))], NOW) == (None, "no_upcoming_race")


def test_unknown_start_time_on_race_day_does_not_guess_or_skip_to_later_race():
    today = event(1, NOW.replace(hour=0), time_confirmed=False)
    later = event(2, NOW + timedelta(days=7))
    assert next_race([today, later], NOW) == (None, "schedule_time_unknown")
    assert not today.results_due(NOW)
    assert today.results_due(NOW + timedelta(days=1))
    assert today.public()["starts_at"] is None


def test_result_delay_boundary_is_not_treated_as_proof_of_results():
    race = event(1, NOW)
    assert not race.results_due(NOW + schedules.RESULT_DELAY - timedelta(seconds=1))
    assert race.results_due(NOW + schedules.RESULT_DELAY)
    coverage = race_coverage([race], [], NOW + schedules.RESULT_DELAY)
    assert coverage["status"] == "missing_results"
    assert coverage["missing_rounds"] == [1]


def test_coverage_detects_gaps_not_just_the_latest_round():
    events = [event(1, NOW - timedelta(days=21)), event(2, NOW - timedelta(days=14)),
              event(3, NOW - timedelta(days=7)), event(4, NOW + timedelta(days=1))]
    rows = [published_row(1), published_row(3), published_row(3), published_row(4)]
    coverage = race_coverage(events, rows, NOW)
    assert coverage["expected_rounds"] == [1, 2, 3]
    assert coverage["loaded_rounds"] == [1, 3]
    assert coverage["missing_rounds"] == [2]
    assert coverage["missing_races"][0]["race"] == "Grand Prix 2"


def test_before_first_race_has_no_missing_results():
    coverage = race_coverage([event(1, NOW + timedelta(days=5))], [], NOW)
    assert coverage["status"] == "no_results_due"
    assert coverage["missing_rounds"] == []


def test_fastf1_calendar_finds_race_session_on_sprint_weekends_and_skips_testing(monkeypatch):
    rows = pd.DataFrame([
        {"RoundNumber": 0, "EventFormat": "testing"},
        {"RoundNumber": 9, "EventFormat": "cancelled"},
        {"RoundNumber": 2, "EventName": "Sprint Weekend GP", "EventFormat": "sprint",
         "Session1": "Sprint", "Session1DateUtc": "2026-06-05T12:00:00Z",
         "Session4": "Race", "Session4DateUtc": "2026-06-07T14:00:00+02:00"},
        {"RoundNumber": 1, "EventName": "Opening GP", "Session5": "Race",
         "Session5DateUtc": pd.Timestamp("2026-03-08T05:00:00")},
    ])
    calls = []
    monkeypatch.setattr(schedules.fastf1, "get_event_schedule", lambda year, **kwargs: (calls.append((year, kwargs)) or rows))
    events = schedules._fastf1_schedule(2026)
    assert [race.round for race in events] == [1, 2]
    assert events[1].starts_at == datetime(2026, 6, 7, 12, tzinfo=UTC)
    assert calls == [(2026, {"include_testing": False, "backend": "fastf1"})]


def test_calendar_without_start_time_retains_date_without_inventing_a_time(monkeypatch):
    monkeypatch.setattr(schedules.fastf1, "get_event_schedule", lambda *args, **kwargs: pd.DataFrame([{
        "RoundNumber": 1, "EventName": "Test GP", "Session5": "Race",
        "Session5DateUtc": pd.NaT, "EventDate": pd.Timestamp("2026-09-25"),
    }]))
    race = schedules._fastf1_schedule(2026)[0]
    assert not race.time_confirmed
    assert race.public()["date"] == "2026-09-25"


def test_calendar_fallback_and_cache_expiration(monkeypatch):
    clock = [0.0]
    calls = []
    monkeypatch.setattr(schedules.time, "monotonic", lambda: clock[0])
    monkeypatch.setattr(schedules, "_fastf1_schedule", lambda year: (_ for _ in ()).throw(RuntimeError("offline")))
    def fallback(year):
        calls.append(year)
        return [event(1, NOW + timedelta(days=len(calls)))]
    monkeypatch.setattr(schedules, "_jolpica_schedule", fallback)
    first = schedules.get_season_schedule(2026)
    first.clear()  # Callers cannot mutate the cache's collection.
    assert len(schedules.get_season_schedule(2026)) == 1
    assert calls == [2026]
    clock[0] = schedules.SCHEDULE_TTL_SECONDS + 1
    assert schedules.get_season_schedule(2026)[0].starts_at == NOW + timedelta(days=2)
    assert calls == [2026, 2026]


def test_failed_calendar_is_not_cached_or_reported_as_an_empty_season(monkeypatch):
    def failed(year):
        raise RuntimeError("offline")
    monkeypatch.setattr(schedules, "_fastf1_schedule", failed)
    monkeypatch.setattr(schedules, "_jolpica_schedule", failed)
    with pytest.raises(HTTPException) as exc:
        schedules.get_season_schedule(2026)
    assert exc.value.status_code == 502
    monkeypatch.setattr(schedules, "_jolpica_schedule", lambda year: [event(1, NOW)])
    assert schedules.get_season_schedule(2026)[0].round == 1


def test_jolpica_schedule_parsing_and_truncation(monkeypatch):
    data = {"MRData": {"total": "2", "RaceTable": {"Races": [
        {"round": "2", "raceName": "Later", "date": "2026-10-04", "time": "14:00:00Z"},
        {"round": "1", "raceName": "Earlier", "date": "2026-09-26"},
    ]}}}
    monkeypatch.setattr(schedules, "_schedule_json", lambda url: data)
    events = schedules._jolpica_schedule(2026)
    assert [e.round for e in events] == [1, 2]
    assert not events[0].time_confirmed
    assert events[1].time_confirmed
    data["MRData"]["total"] = "24"
    with pytest.raises(ValueError, match="Truncated"):
        schedules._jolpica_schedule(2026)


def test_only_due_events_are_requested_from_fastf1(monkeypatch):
    events = [event(1, NOW - timedelta(days=5)), event(2, NOW + timedelta(days=1)), event(3, NOW - timedelta(hours=1))]
    calls = []
    monkeypatch.setattr(h2h, "utc_now", lambda: NOW)
    monkeypatch.setattr(h2h, "_ensure_fastf1_cache_enabled", lambda: None)
    def session(year, number, kind):
        calls.append((year, number, kind))
        return SimpleNamespace(
            event=SimpleNamespace(get_session_date=lambda *args, **kwargs: events[0].starts_at),
            load=lambda **kwargs: None,
            results=pd.DataFrame([{"Abbreviation": "NOR", "Position": 1, "Status": "Finished"}]),
        )
    monkeypatch.setattr(h2h.fastf1, "get_session", session)
    rows = h2h._load_fastf1_results(2026, events, False)
    assert calls == [(2026, 1, "R")]
    assert rows[0]["round"] == 1
    assert rows[0]["race_date"] == "2026-09-20"


@pytest.mark.parametrize("status", ["", "Running", "Unknown"])
def test_fastf1_grid_only_rows_are_not_results(monkeypatch, status):
    past = event(1, NOW - timedelta(days=1))
    monkeypatch.setattr(h2h, "_ensure_fastf1_cache_enabled", lambda: None)
    monkeypatch.setattr(h2h.fastf1, "get_session", lambda *args: SimpleNamespace(
        event=SimpleNamespace(get_session_date=lambda *args, **kwargs: past.starts_at),
        load=lambda **kwargs: None,
        results=pd.DataFrame([{"Abbreviation": "NOR", "Position": 1, "Status": status}]),
    ))
    assert h2h._load_fastf1_results(2026, [past], False) == []


def test_jolpica_filters_future_results_and_matches_dates_when_rounds_differ(monkeypatch):
    events = [event(7, NOW - timedelta(days=1)), event(8, NOW + timedelta(days=1))]
    monkeypatch.setattr(h2h, "get_season_schedule", lambda year: events)
    races = [{"round": str(number), "raceName": name, "date": date,
              "Results": [{"Driver": {"code": "NOR"}, "position": "1", "status": "Finished"}]}
             for number, name, date in [(5, "Past", "2026-09-24"), (6, "Future", "2026-09-26")]]
    monkeypatch.setattr(h2h, "_fetch_json", lambda url: {"MRData": {"RaceTable": {"Races": races}}})
    rows = h2h._load_jolpica_results(2026)
    assert len(rows) == 1
    assert rows[0]["round"] == 7
    assert rows[0]["race"] == "Past"


def test_openf1_does_not_request_results_for_future_or_unfinished_sessions(monkeypatch):
    monkeypatch.setattr(h2h, "utc_now", lambda: NOW)
    monkeypatch.setattr(h2h, "get_season_schedule", lambda year: [event(1, NOW - timedelta(days=1))])
    def fetch(url):
        assert "/sessions?" in url
        return [
            {"session_key": 1, "date_start": "2026-09-26T10:00:00Z", "date_end": "2026-09-26T12:00:00Z"},
            {"session_key": 2, "date_start": "2026-09-24T10:00:00Z", "date_end": None},
            {"session_key": 3, "date_start": "2026-09-24T10:00:00Z", "date_end": "2026-09-25T13:00:00Z"},
        ]
    monkeypatch.setattr(h2h, "_fetch_json", fetch)
    assert h2h._load_openf1_results(2026) == []


def test_historical_partial_fastf1_results_do_not_skip_fallback_sources(monkeypatch):
    calls = []
    monkeypatch.setattr(h2h, "_load_fastf1_results", lambda *args: [{**published_row(1), "year": 2024, "source": "fastf1"}])
    monkeypatch.setattr(h2h, "_load_jolpica_results", lambda year: (calls.append("jolpica") or [{**published_row(2), "year": year, "source": "jolpica"}]))
    monkeypatch.setattr(h2h, "_load_openf1_results", lambda year: (calls.append("openf1") or []))
    assert len(h2h._load_results(2024)) == 2
    assert calls == ["jolpica", "openf1"]


def test_season_end_prediction_does_not_load_history_or_invent_a_target(client, monkeypatch):
    monkeypatch.setattr(h2h, "get_season_schedule", lambda year: [event(1, NOW - timedelta(days=1))])
    monkeypatch.setattr(h2h, "_load_results", lambda *args, **kwargs: pytest.fail("No prediction history should be loaded"))
    response = client.get("/api/h2h/predict?driver1=NOR&driver2=PIA")
    assert response.status_code == 200
    data = response.json()
    assert data["prediction_status"] == "no_upcoming_race"
    assert data["predicted_winner"] is None
    assert data["next_race"] is None


def test_missing_calendar_returns_an_explicit_api_error(client, monkeypatch):
    def unavailable(year):
        raise HTTPException(502, "Race schedule unavailable.")
    monkeypatch.setattr(h2h, "get_season_schedule", unavailable)
    response = client.get("/api/h2h/predict?driver1=NOR&driver2=PIA")
    assert response.status_code == 502
    assert "schedule unavailable" in response.json()["detail"]


def test_compare_reports_missing_rounds_from_the_actual_returned_rows(client, monkeypatch, sample_h2h_rows):
    monkeypatch.setattr(h2h, "_load_results", lambda *args, **kwargs: sample_h2h_rows[:3])
    response = client.get("/api/h2h/compare?driver1=NOR&driver2=PIA&year=2026")
    assert response.status_code == 200
    assert response.json()["coverage"]["missing_rounds"] == [2]


def test_jolpica_pagination_reassembles_races_split_between_pages(monkeypatch):
    calls = []
    def fetch(url):
        params = parse_qs(urlparse(url).query)
        offset = int(params["offset"][0])
        calls.append(offset)
        result = {"Driver": {"code": "NOR" if offset == 0 else "PIA"},
                  "position": str(offset + 1), "status": "Finished"}
        return {"MRData": {"total": "2", "limit": "1", "offset": str(offset),
                "RaceTable": {"Races": [{"round": "1", "date": "2026-03-08", "raceName": "Australia",
                                         "Results": [result]}]}}}
    monkeypatch.setattr(h2h, "_fetch_json", fetch)
    rows = h2h._load_jolpica_results(2026)
    assert calls == [0, 1]
    assert [row["abbreviation"] for row in rows] == ["NOR", "PIA"]
    assert [row["position"] for row in rows] == [1, 2]


def test_jolpica_does_not_silently_accept_a_truncated_page(monkeypatch):
    monkeypatch.setattr(h2h, "_fetch_json", lambda url: {"MRData": {"total": "100", "RaceTable": {"Races": []}}})
    with pytest.raises(ValueError, match="pagination"):
        h2h._jolpica_result_races(2026)


def test_jolpica_detects_a_repeated_page_instead_of_looping(monkeypatch):
    monkeypatch.setattr(h2h, "_fetch_json", lambda url: {"MRData": {
        "total": "2", "offset": "0", "RaceTable": {"Races": [{"round": "1", "date": "2026-03-08", "Results": [{}]}]},
    }})
    with pytest.raises(ValueError, match="pagination"):
        h2h._jolpica_result_races(2026)
