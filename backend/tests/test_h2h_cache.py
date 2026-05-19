import pytest

from app.services import h2h_cache


def test_cache_can_be_cleared_between_calls(monkeypatch):
    calls = []
    monkeypatch.setenv("H2H_CACHE_TTL_SECONDS", "21600")

    def loader(year, strict=True):
        calls.append((year, strict))
        return [{"year": year, "race": "Race", "abbreviation": "NOR"}]

    assert h2h_cache.get_cached_season_results(2026, loader) == [
        {"year": 2026, "race": "Race", "abbreviation": "NOR"}
    ]
    h2h_cache.clear_h2h_cache()
    assert h2h_cache.get_cached_season_results(2026, loader) == [
        {"year": 2026, "race": "Race", "abbreviation": "NOR"}
    ]

    assert calls == [(2026, True), (2026, True)]


def test_expired_cache_entry_refreshes(monkeypatch):
    calls = []
    now = [100.0]
    monkeypatch.setenv("H2H_CACHE_TTL_SECONDS", "10")
    monkeypatch.setattr(h2h_cache.time, "monotonic", lambda: now[0])

    def loader(year, strict=True):
        calls.append((year, strict))
        return [{"year": year, "race": f"Race {len(calls)}", "abbreviation": "NOR"}]

    first = h2h_cache.get_cached_season_results(2026, loader)
    now[0] = 105.0
    second = h2h_cache.get_cached_season_results(2026, loader)
    now[0] = 111.0
    third = h2h_cache.get_cached_season_results(2026, loader)

    assert first == [{"year": 2026, "race": "Race 1", "abbreviation": "NOR"}]
    assert second == first
    assert third == [{"year": 2026, "race": "Race 2", "abbreviation": "NOR"}]
    assert calls == [(2026, True), (2026, True)]


def test_loader_exceptions_are_not_cached(monkeypatch):
    calls = []
    monkeypatch.setenv("H2H_CACHE_TTL_SECONDS", "21600")

    def loader(year, strict=True):
        calls.append((year, strict))
        if len(calls) == 1:
            raise RuntimeError("temporary failure")
        return [{"year": year, "race": "Race", "abbreviation": "NOR"}]

    with pytest.raises(RuntimeError, match="temporary failure"):
        h2h_cache.get_cached_season_results(2026, loader)

    assert h2h_cache.get_cached_season_results(2026, loader) == [
        {"year": 2026, "race": "Race", "abbreviation": "NOR"}
    ]
    assert calls == [(2026, True), (2026, True)]


def test_empty_results_are_not_cached(monkeypatch):
    calls = []
    monkeypatch.setenv("H2H_CACHE_TTL_SECONDS", "21600")

    def loader(year, strict=True):
        calls.append((year, strict))
        return [] if len(calls) == 1 else [{"year": year, "race": "Race", "abbreviation": "NOR"}]

    assert h2h_cache.get_cached_season_results(2026, loader) == []
    assert h2h_cache.get_cached_season_results(2026, loader) == [
        {"year": 2026, "race": "Race", "abbreviation": "NOR"}
    ]
    assert calls == [(2026, True), (2026, True)]


@pytest.mark.parametrize("value", [None, "", "0", "-1", "not-an-int"])
def test_invalid_ttl_env_values_use_default(monkeypatch, value):
    if value is None:
        monkeypatch.delenv("H2H_CACHE_TTL_SECONDS", raising=False)
    else:
        monkeypatch.setenv("H2H_CACHE_TTL_SECONDS", value)

    assert h2h_cache.get_h2h_cache_ttl_seconds() == h2h_cache.DEFAULT_H2H_CACHE_TTL_SECONDS


def test_valid_ttl_env_value_is_used(monkeypatch):
    monkeypatch.setenv("H2H_CACHE_TTL_SECONDS", "42")

    assert h2h_cache.get_h2h_cache_ttl_seconds() == 42
