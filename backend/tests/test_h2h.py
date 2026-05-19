import pytest

from app.routers import h2h


def test_h2h_compare_valid_request_uses_mocked_loader(
    client, monkeypatch, sample_h2h_rows, block_live_h2h_sources
):
    calls = []

    def fake_load_results(year, strict=True):
        calls.append((year, strict))
        return sample_h2h_rows

    monkeypatch.setattr(h2h, "_load_results", fake_load_results)

    response = client.get(
        "/api/h2h/compare",
        params={"driver1": "NOR", "driver2": "PIA", "year": 2026},
    )

    assert response.status_code == 200
    assert calls == [(2026, True)]
    data = response.json()
    assert data["year"] == 2026
    assert data["driver1"]["abbreviation"] == "NOR"
    assert data["driver2"]["abbreviation"] == "PIA"
    assert data["driver1"]["wins"] == 1
    assert data["driver2"]["wins"] == 1


def test_h2h_compare_invalid_driver_current_behavior(
    client, monkeypatch, sample_h2h_rows, block_live_h2h_sources
):
    monkeypatch.setattr(h2h, "_load_results", lambda year, strict=True: sample_h2h_rows)

    response = client.get(
        "/api/h2h/compare",
        params={"driver1": "XXX", "driver2": "PIA", "year": 2026},
    )

    assert response.status_code == 404


def test_h2h_compare_unsupported_year_does_not_call_live_sources(
    client, block_live_h2h_sources
):
    response = client.get(
        "/api/h2h/compare",
        params={"driver1": "NOR", "driver2": "PIA", "year": 2030},
    )

    assert response.status_code == 404


@pytest.mark.xfail(
    reason="Future behavior: driver codes should be stripped before validation and lookup."
)
def test_h2h_compare_should_accept_lowercase_whitespace_driver_codes(
    client, monkeypatch, sample_h2h_rows, block_live_h2h_sources
):
    monkeypatch.setattr(h2h, "_load_results", lambda year, strict=True: sample_h2h_rows)

    response = client.get(
        "/api/h2h/compare",
        params={"driver1": " nor ", "driver2": " pia ", "year": 2026},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["driver1"]["abbreviation"] == "NOR"
    assert data["driver2"]["abbreviation"] == "PIA"


@pytest.mark.xfail(reason="Future behavior: comparing a driver with themself should be rejected.")
def test_h2h_compare_should_reject_same_driver(
    client, monkeypatch, sample_h2h_rows, block_live_h2h_sources
):
    monkeypatch.setattr(h2h, "_load_results", lambda year, strict=True: sample_h2h_rows)

    response = client.get(
        "/api/h2h/compare",
        params={"driver1": "NOR", "driver2": "NOR", "year": 2026},
    )

    assert response.status_code in {400, 422}


def test_h2h_predict_valid_request_uses_mocked_loader(
    client, monkeypatch, sample_h2h_rows, block_live_h2h_sources
):
    calls = []

    def fake_load_results(year, strict=True):
        calls.append((year, strict))
        return sample_h2h_rows

    monkeypatch.setattr(h2h, "_load_results", fake_load_results)

    response = client.get(
        "/api/h2h/predict",
        params={"driver1": "NOR", "driver2": "PIA"},
    )

    assert response.status_code == 200
    assert calls == [(2024, False), (2025, False), (2026, False)]
    data = response.json()
    assert data["next_race"] == h2h.NEXT_RACE
    assert data["predicted_winner"] in {"NOR", "PIA"}
    assert data["h2h_record"]["total_races"] == 2


def test_h2h_predict_invalid_driver_current_behavior(
    client, monkeypatch, sample_h2h_rows, block_live_h2h_sources
):
    monkeypatch.setattr(h2h, "_load_results", lambda year, strict=True: sample_h2h_rows)

    response = client.get(
        "/api/h2h/predict",
        params={"driver1": "XXX", "driver2": "PIA"},
    )

    assert response.status_code == 404
