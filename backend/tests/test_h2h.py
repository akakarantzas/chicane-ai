from app.routers import h2h


def fail_if_loader_called(*args, **kwargs):
    raise AssertionError("H2H loader should not be called for invalid requests")


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


def test_h2h_compare_normalizes_lowercase_driver_codes(
    client, monkeypatch, sample_h2h_rows, block_live_h2h_sources
):
    monkeypatch.setattr(h2h, "_load_results", lambda year, strict=True: sample_h2h_rows)

    response = client.get(
        "/api/h2h/compare",
        params={"driver1": "nor", "driver2": "pia", "year": 2026},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["driver1"]["abbreviation"] == "NOR"
    assert data["driver2"]["abbreviation"] == "PIA"


def test_h2h_compare_strips_whitespace_from_driver_codes(
    client, monkeypatch, sample_h2h_rows, block_live_h2h_sources
):
    monkeypatch.setattr(h2h, "_load_results", lambda year, strict=True: sample_h2h_rows)

    response = client.get(
        "/api/h2h/compare",
        params={"driver1": " NOR ", "driver2": " PIA ", "year": 2026},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["driver1"]["abbreviation"] == "NOR"
    assert data["driver2"]["abbreviation"] == "PIA"


def test_h2h_compare_invalid_driver1_returns_400_without_loading_data(
    client, monkeypatch, block_live_h2h_sources
):
    monkeypatch.setattr(h2h, "_load_results", fail_if_loader_called)

    response = client.get(
        "/api/h2h/compare",
        params={"driver1": "XXX", "driver2": "PIA", "year": 2026},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Unknown driver1: XXX"


def test_h2h_compare_invalid_driver2_returns_400_without_loading_data(
    client, monkeypatch, block_live_h2h_sources
):
    monkeypatch.setattr(h2h, "_load_results", fail_if_loader_called)

    response = client.get(
        "/api/h2h/compare",
        params={"driver1": "NOR", "driver2": "XXX", "year": 2026},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Unknown driver2: XXX"


def test_h2h_compare_unsupported_year_returns_400_without_loading_data(
    client, monkeypatch, block_live_h2h_sources
):
    monkeypatch.setattr(h2h, "_load_results", fail_if_loader_called)

    response = client.get(
        "/api/h2h/compare",
        params={"driver1": "NOR", "driver2": "PIA", "year": 2030},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Unsupported year: 2030"


def test_h2h_compare_rejects_same_driver_without_loading_data(
    client, monkeypatch, block_live_h2h_sources
):
    monkeypatch.setattr(h2h, "_load_results", fail_if_loader_called)

    response = client.get(
        "/api/h2h/compare",
        params={"driver1": "NOR", "driver2": " nor ", "year": 2026},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Drivers must be different."


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


def test_h2h_predict_normalizes_driver_codes(
    client, monkeypatch, sample_h2h_rows, block_live_h2h_sources
):
    monkeypatch.setattr(h2h, "_load_results", lambda year, strict=True: sample_h2h_rows)

    response = client.get(
        "/api/h2h/predict",
        params={"driver1": " nor ", "driver2": " pia "},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["predicted_winner"] in {"NOR", "PIA"}


def test_h2h_predict_invalid_driver1_returns_400_without_loading_data(
    client, monkeypatch, block_live_h2h_sources
):
    monkeypatch.setattr(h2h, "_load_results", fail_if_loader_called)

    response = client.get(
        "/api/h2h/predict",
        params={"driver1": "XXX", "driver2": "PIA"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Unknown driver1: XXX"


def test_h2h_predict_invalid_driver2_returns_400_without_loading_data(
    client, monkeypatch, block_live_h2h_sources
):
    monkeypatch.setattr(h2h, "_load_results", fail_if_loader_called)

    response = client.get(
        "/api/h2h/predict",
        params={"driver1": "NOR", "driver2": "XXX"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Unknown driver2: XXX"


def test_h2h_predict_rejects_same_driver_without_loading_data(
    client, monkeypatch, block_live_h2h_sources
):
    monkeypatch.setattr(h2h, "_load_results", fail_if_loader_called)

    response = client.get(
        "/api/h2h/predict",
        params={"driver1": "nor", "driver2": " NOR "},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Drivers must be different."
