import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routers import contact
from app.services.h2h_cache import clear_h2h_cache


@pytest.fixture(autouse=True)
def clear_process_state():
    contact._RATE_STORE.clear()
    clear_h2h_cache()
    yield
    contact._RATE_STORE.clear()
    clear_h2h_cache()


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
