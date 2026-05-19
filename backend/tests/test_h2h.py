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


def test_h2h_compare_reuses_cached_data_for_same_year(
    client, monkeypatch, sample_h2h_rows, block_live_h2h_sources
):
    calls = []

    def fake_load_results(year, strict=True):
        calls.append((year, strict))
        return sample_h2h_rows

    monkeypatch.setattr(h2h, "_load_results", fake_load_results)

    for _ in range(2):
        response = client.get(
            "/api/h2h/compare",
            params={"driver1": "NOR", "driver2": "PIA", "year": 2026},
        )
        assert response.status_code == 200

    assert calls == [(2026, True)]


def test_h2h_compare_uses_separate_cache_entries_by_year(
    client, monkeypatch, sample_h2h_rows, block_live_h2h_sources
):
    calls = []

    def fake_load_results(year, strict=True):
        calls.append((year, strict))
        return [
            {**row, "year": year, "race": f"{row['race']} {year}"}
            for row in sample_h2h_rows
        ]

    monkeypatch.setattr(h2h, "_load_results", fake_load_results)

    response_2026 = client.get(
        "/api/h2h/compare",
        params={"driver1": "NOR", "driver2": "PIA", "year": 2026},
    )
    response_2025 = client.get(
        "/api/h2h/compare",
        params={"driver1": "NOR", "driver2": "PIA", "year": 2025},
    )

    assert response_2026.status_code == 200
    assert response_2025.status_code == 200
    assert calls == [(2026, True), (2025, True)]


def test_fastf1_cache_is_enabled_lazily(monkeypatch):
    calls = []
    monkeypatch.setattr(h2h, "_fastf1_cache_enabled", False)
    monkeypatch.setattr(h2h.os, "makedirs", lambda path, exist_ok=True: calls.append(("makedirs", path, exist_ok)))
    monkeypatch.setattr(h2h.fastf1.Cache, "enable_cache", lambda path: calls.append(("enable_cache", path)))
    monkeypatch.setattr(h2h.fastf1, "get_session", lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("no live fastf1")))

    assert h2h._load_fastf1_results(2026, ["Australia"], strict=False) == []
    assert h2h._load_fastf1_results(2026, ["China"], strict=False) == []

    assert calls == [
        ("makedirs", h2h.CACHE_DIR, True),
        ("enable_cache", h2h.CACHE_DIR),
    ]


def test_load_results_falls_back_when_fastf1_fails(monkeypatch, sample_h2h_rows):
    calls = []

    def fail_fastf1(year, race_names, strict):
        calls.append("fastf1")
        raise RuntimeError("fastf1 unavailable")

    def load_jolpica(year):
        calls.append("jolpica")
        return sample_h2h_rows

    def load_openf1(year):
        calls.append("openf1")
        return []

    monkeypatch.setattr(h2h, "_load_fastf1_results", fail_fastf1)
    monkeypatch.setattr(h2h, "_load_jolpica_results", load_jolpica)
    monkeypatch.setattr(h2h, "_load_openf1_results", load_openf1)

    assert h2h._load_results(2026) == sample_h2h_rows
    assert calls == ["fastf1", "jolpica", "openf1"]


def test_load_results_uses_openf1_if_jolpica_fails(monkeypatch, sample_h2h_rows):
    calls = []

    def load_fastf1(year, race_names, strict):
        calls.append("fastf1")
        return []

    def fail_jolpica(year):
        calls.append("jolpica")
        raise RuntimeError("jolpica unavailable")

    def load_openf1(year):
        calls.append("openf1")
        return sample_h2h_rows

    monkeypatch.setattr(h2h, "_load_fastf1_results", load_fastf1)
    monkeypatch.setattr(h2h, "_load_jolpica_results", fail_jolpica)
    monkeypatch.setattr(h2h, "_load_openf1_results", load_openf1)

    assert h2h._load_results(2026) == sample_h2h_rows
    assert calls == ["fastf1", "jolpica", "openf1"]


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


def test_h2h_predict_reuses_cached_data_across_seasons(
    client, monkeypatch, sample_h2h_rows, block_live_h2h_sources
):
    calls = []

    def fake_load_results(year, strict=True):
        calls.append((year, strict))
        return [
            {**row, "year": year, "race": f"{row['race']} {year}"}
            for row in sample_h2h_rows
        ]

    monkeypatch.setattr(h2h, "_load_results", fake_load_results)

    for _ in range(2):
        response = client.get(
            "/api/h2h/predict",
            params={"driver1": "NOR", "driver2": "PIA"},
        )
        assert response.status_code == 200

    assert calls == [(2024, False), (2025, False), (2026, False)]


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
