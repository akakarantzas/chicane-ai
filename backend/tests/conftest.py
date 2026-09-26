import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from app.main import app
from app.routers import contact
from app.services.h2h_cache import clear_h2h_cache
from app.services.h2h_schedule import RaceEvent, clear_schedule_cache


@pytest.fixture(autouse=True)
def fixed_h2h_calendar(monkeypatch):
    """API/unit tests never depend on a live schedule or the wall-clock date."""
    from app.routers import h2h
    from app.services.h2h_standings import unavailable_standings
    monkeypatch.setattr(h2h, "_load_standings", lambda *args: unavailable_standings())
    monkeypatch.setattr(h2h, "utc_now", lambda: datetime(2026, 9, 25, tzinfo=timezone.utc))
    monkeypatch.setattr(h2h, "get_season_schedule", lambda year: [
        RaceEvent(year, 1, "Australia", datetime(year, 3, 8, 5, tzinfo=timezone.utc)),
        RaceEvent(year, 2, "China", datetime(year, 3, 15, 7, tzinfo=timezone.utc)),
        RaceEvent(year, 3, "Next Test Grand Prix", datetime(year, 9, 26, 11, tzinfo=timezone.utc)),
    ])


@pytest.fixture(autouse=True)
def clear_process_state():
    contact._RATE_STORE.clear()
    clear_h2h_cache()
    clear_schedule_cache()
    yield
    contact._RATE_STORE.clear()
    clear_h2h_cache()
    clear_schedule_cache()


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def client_no_raise():
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture
def sample_h2h_rows():
    return [
        {
            "abbreviation": "NOR",
            "full_name": "Lando Norris",
            "team": "McLaren",
            "number": "1",
            "position": 1,
            "points": 25.0,
            "race": "Australia",
            "round": 1,
            "year": 2026,
            "source": "test",
        },
        {
            "abbreviation": "PIA",
            "full_name": "Oscar Piastri",
            "team": "McLaren",
            "number": "81",
            "position": 2,
            "points": 18.0,
            "race": "Australia",
            "round": 1,
            "year": 2026,
            "source": "test",
        },
        {
            "abbreviation": "RUS",
            "full_name": "George Russell",
            "team": "Mercedes",
            "number": "63",
            "position": 3,
            "points": 15.0,
            "race": "Australia",
            "round": 1,
            "year": 2026,
            "source": "test",
        },
        {
            "abbreviation": "NOR",
            "full_name": "Lando Norris",
            "team": "McLaren",
            "number": "1",
            "position": 4,
            "points": 12.0,
            "race": "China",
            "round": 2,
            "year": 2026,
            "source": "test",
        },
        {
            "abbreviation": "PIA",
            "full_name": "Oscar Piastri",
            "team": "McLaren",
            "number": "81",
            "position": 1,
            "points": 25.0,
            "race": "China",
            "round": 2,
            "year": 2026,
            "source": "test",
        },
    ]


@pytest.fixture
def block_live_h2h_sources(monkeypatch):
    from app.routers import h2h

    def fail_live_call(*args, **kwargs):
        raise AssertionError("Live H2H data source was called during a test")

    monkeypatch.setattr(h2h, "_load_fastf1_results", fail_live_call)
    monkeypatch.setattr(h2h, "_load_jolpica_results", fail_live_call)
    monkeypatch.setattr(h2h, "_load_openf1_results", fail_live_call)
