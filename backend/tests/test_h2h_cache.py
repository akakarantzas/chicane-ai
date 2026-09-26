from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from threading import Event

import pytest
from fastapi import HTTPException

from app.services import h2h_cache as cache
from app.services.h2h_schedule import RaceEvent
from app.services.h2h_standings import unavailable_standings


NOW = datetime(2026, 9, 25, tzinfo=timezone.utc)
EVENTS = [RaceEvent(2026, number, f"GP {number}", NOW - timedelta(days=3-number)) for number in (1, 2)]


def payload():
    return {"rows": [{"year": 2026, "round": number, "race": f"GP {number}", "abbreviation": code,
                      "position": index, "source": "jolpica", "sources": ["jolpica"]}
                     for number in (1, 2) for index, code in enumerate(("NOR", "PIA"), 1)],
            "standings": {"status": "available", "through_event": {"round": 2}, "drivers": {}}}


@pytest.fixture
def clock(monkeypatch):
    clock = [0.0]
    monkeypatch.setattr(cache.time, "monotonic", lambda: clock[0])
    monkeypatch.setenv("H2H_CACHE_TTL_SECONDS", "10")
    return clock


def get(clock, loader=lambda *args: payload(), *, events=EVENTS, pin=None):
    return cache.get_season_snapshot(2026, events, NOW + timedelta(seconds=clock[0]), loader, snapshot_id=pin)


def test_shared_snapshot_reuses_both_results_and_standings(clock):
    calls = []
    def loader(*args):
        calls.append(args[0])
        return payload()
    first = get(clock, loader)
    clock[0] = 5
    second = get(clock, loader)
    assert calls == [2026]
    assert first["freshness"]["snapshot_id"] == second["freshness"]["snapshot_id"]
    assert second["freshness"]["age_seconds"] == 5
    cache.clear_h2h_cache()
    assert get(clock, loader)["freshness"]["snapshot_id"] != first["freshness"]["snapshot_id"]
    assert calls == [2026, 2026]


def test_refresh_changes_id_and_resets_age_only_on_success(clock):
    first = get(clock)
    clock[0] = 11
    second = get(clock)
    assert second["freshness"]["snapshot_id"] != first["freshness"]["snapshot_id"]
    assert second["freshness"]["retrieved_at"] != first["freshness"]["retrieved_at"]
    assert second["freshness"]["age_seconds"] == 0


def test_nested_mutation_cannot_corrupt_cached_or_pinned_data(clock):
    first = get(clock)
    pin = first["freshness"]["snapshot_id"]
    first["rows"][0]["sources"].append("fake")
    first["standings"]["status"] = "bad"
    first["coverage"]["missing_rounds"].append(99)
    cached = get(clock, pin=pin)
    assert cached["rows"][0]["sources"] == ["jolpica"]
    assert cached["standings"]["status"] == "available"
    assert cached["coverage"]["missing_rounds"] == []


@pytest.mark.parametrize("mode", ["exception", "empty", "missing_driver"])
def test_failed_or_regressed_refresh_keeps_whole_last_good_bundle(clock, mode):
    first = get(clock)
    clock[0] = 11
    def failed(*args):
        if mode == "exception":
            raise RuntimeError("secret provider details")
        data = payload()
        data["rows"] = [] if mode == "empty" else data["rows"][:-1]
        data["standings"]["new_value"] = "must not mix"
        return data
    stale = get(clock, failed)
    assert stale["rows"] == first["rows"]
    assert stale["standings"] == first["standings"]
    assert stale["freshness"]["status"] == "stale"
    assert stale["freshness"]["snapshot_id"] == first["freshness"]["snapshot_id"]
    assert stale["freshness"]["retrieved_at"] == first["freshness"]["retrieved_at"]
    assert stale["freshness"]["age_seconds"] == 11
    assert "secret" not in str(stale)
    clock[0] = 20
    assert get(clock, lambda *args: pytest.fail("Retry cooldown"))["freshness"]["status"] == "stale"
    clock[0] = 72
    assert get(clock)["freshness"]["status"] == "fresh"


def test_no_cache_failure_is_unavailable_with_bounded_retry(clock):
    def failed(*args):
        raise RuntimeError("offline")
    first = get(clock, failed)
    assert first["rows"] == []
    assert first["freshness"]["status"] == "unavailable"
    assert first["freshness"]["retrieved_at"] is None
    clock[0] = 2
    assert get(clock, lambda *args: pytest.fail("No retry yet"))["freshness"]["status"] == "unavailable"
    clock[0] = 11
    assert get(clock)["freshness"]["status"] == "fresh"


def test_stale_data_is_not_served_forever(clock):
    first = get(clock)
    clock[0] = cache.MAX_STALE_SECONDS + 1
    failed = lambda *args: {"rows": [], "standings": unavailable_standings()}
    expired = get(clock, failed)
    assert expired["rows"] == []
    assert expired["freshness"]["status"] == "unavailable"
    with pytest.raises(HTTPException) as exc:
        get(clock, pin=first["freshness"]["snapshot_id"])
    assert exc.value.status_code == 409


def test_slow_failed_refresh_cannot_cross_the_stale_age_limit(clock):
    get(clock)
    clock[0] = cache.MAX_STALE_SECONDS - 1
    def slow_failure(*args):
        clock[0] += 2
        return {"rows": [], "standings": unavailable_standings()}
    data = get(clock, slow_failure)
    assert data["freshness"]["status"] == "unavailable"
    assert data["rows"] == []


def test_new_due_round_forces_refresh_before_ttl(clock):
    first = get(clock)
    events = EVENTS + [RaceEvent(2026, 3, "GP 3", NOW - timedelta(hours=5))]
    calls = []
    second = get(clock, lambda *args: calls.append(1) or payload(), events=events)
    assert calls == [1]
    assert second["freshness"]["snapshot_id"] != first["freshness"]["snapshot_id"]
    assert second["coverage"]["missing_rounds"] == [3]
    assert second["standings"]["status"] == "stale"
    assert second["standings"]["drivers"] == {}


def test_failed_new_round_refresh_reports_old_age_and_new_missing_round(clock):
    first = get(clock)
    events = EVENTS + [RaceEvent(2026, 3, "GP 3", NOW - timedelta(hours=5))]
    data = get(clock, lambda *args: {"rows": [], "standings": unavailable_standings()}, events=events)
    assert data["freshness"]["snapshot_id"] == first["freshness"]["snapshot_id"]
    assert data["freshness"]["status"] == "stale"
    assert data["coverage"]["missing_rounds"] == [3]
    pinned = get(clock, events=events, pin=first["freshness"]["snapshot_id"])
    assert pinned["freshness"]["status"] == "stale"
    assert pinned["coverage"]["missing_rounds"] == [3]


def test_preseason_empty_snapshot_is_not_a_failed_source_fetch(clock):
    data = get(clock, lambda *args: pytest.fail("No completed races to fetch"), events=[])
    assert data["rows"] == []
    assert data["coverage"]["status"] == "no_results_due"
    assert data["freshness"]["status"] == "fresh"
    assert data["freshness"]["partial"] is False


def test_changed_calendar_does_not_reuse_incompatible_old_results(clock):
    get(clock)
    corrected = [RaceEvent(2026, 1, "Corrected GP", NOW - timedelta(days=4))]
    data = get(clock, lambda *args: {"rows": [], "standings": unavailable_standings()}, events=corrected)
    assert data["freshness"]["status"] == "unavailable"
    assert data["rows"] == []


def test_pin_keeps_exact_old_version_after_refresh(clock):
    first = get(clock)
    clock[0] = 11
    replacement = payload()
    replacement["rows"][0]["position"] = 5
    newest = get(clock, lambda *args: replacement)
    pinned = get(clock, pin=first["freshness"]["snapshot_id"])
    assert newest["rows"][0]["position"] == 5
    assert pinned["rows"][0]["position"] == 1
    assert pinned["freshness"]["status"] == "stale"


def test_unknown_evicted_wrong_season_and_changed_calendar_pins_fail_explicitly(clock):
    first = get(clock)
    for index in range(cache.MAX_VERSIONS_PER_SEASON):
        clock[0] += 11
        get(clock)
    with pytest.raises(HTTPException):
        get(clock, pin=first["freshness"]["snapshot_id"])
    with pytest.raises(HTTPException):
        get(clock, pin="unknown")
    latest = get(clock)
    with pytest.raises(HTTPException):
        cache.get_season_snapshot(2025, [], NOW, lambda *args: payload(), snapshot_id=latest["freshness"]["snapshot_id"])
    with pytest.raises(HTTPException):
        get(clock, events=EVENTS[:1], pin=latest["freshness"]["snapshot_id"])


def test_simultaneous_requests_run_only_one_loader(clock):
    started, release, second_started = Event(), Event(), Event()
    calls = []
    def loader(*args):
        calls.append(1)
        started.set()
        assert release.wait(3)
        return payload()
    def second():
        second_started.set()
        return get(clock, loader)
    with ThreadPoolExecutor(max_workers=2) as pool:
        first = pool.submit(get, clock, loader)
        assert started.wait(3)
        other = pool.submit(second)
        assert second_started.wait(3)
        release.set()
        assert first.result()["freshness"]["snapshot_id"] == other.result()["freshness"]["snapshot_id"]
    assert calls == [1]


def test_partial_snapshot_retries_sooner_than_normal_ttl(clock, monkeypatch):
    monkeypatch.setenv("H2H_CACHE_TTL_SECONDS", "900")
    partial = payload()
    partial["standings"] = unavailable_standings()
    first = get(clock, lambda *args: partial)
    assert first["freshness"]["status"] == "fresh"
    assert first["freshness"]["partial"] is True
    clock[0] = 61
    assert get(clock)["freshness"]["snapshot_id"] != first["freshness"]["snapshot_id"]


def test_historical_default_is_longer_but_env_override_still_applies(clock, monkeypatch):
    monkeypatch.delenv("H2H_CACHE_TTL_SECONDS")
    past_events = [RaceEvent(2025, 1, "Past GP", NOW.replace(year=2025))]
    data = {"rows": [{"year": 2025, "round": 1, "abbreviation": "NOR"}], "standings": unavailable_standings()}
    snapshot = cache.get_season_snapshot(2025, past_events, NOW, lambda *args: data)
    assert snapshot["freshness"]["ttl_seconds"] == cache.HISTORICAL_TTL_SECONDS


@pytest.mark.parametrize("value", [None, "", "0", "-1", "not-an-int"])
def test_invalid_ttl_env_values_use_default(monkeypatch, value):
    if value is None:
        monkeypatch.delenv("H2H_CACHE_TTL_SECONDS", raising=False)
    else:
        monkeypatch.setenv("H2H_CACHE_TTL_SECONDS", value)
    assert cache.get_h2h_cache_ttl_seconds() == cache.DEFAULT_H2H_CACHE_TTL_SECONDS


def test_valid_ttl_env_value_is_used(monkeypatch):
    monkeypatch.setenv("H2H_CACHE_TTL_SECONDS", "42")
    assert cache.get_h2h_cache_ttl_seconds() == 42
