import pytest
import sys

from app.routers import predictions


def test_health_check(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_next_race_predictions_preserve_current_barcelona_catalunya_values(client):
    response = client.get("/api/predictions/next-race")

    assert response.status_code == 200
    data = response.json()
    assert {"race", "circuit", "predictions", "model_version", "status"} <= set(data)
    assert data["race"] == "Barcelona-Catalunya GP"
    assert data["circuit"] == "Circuit de Barcelona-Catalunya"
    assert data["model_version"] == "barcelona-catalunya-hgb-calibrated-1.0"
    assert isinstance(data["predictions"], list)
    assert data["predictions"]

    piastri = next(
        item for item in data["predictions"] if item["driver"] == "Piastri"
    )
    assert piastri["team"] == "McLaren"
    assert piastri["probability"] == pytest.approx(0.2602)


def test_next_race_predictions_use_json_without_model_import(client, monkeypatch):
    sys.modules.pop("app.models.predict", None)

    def fail_model_load(path):
        raise AssertionError("JSON prediction endpoint should not load rf_model.pkl")

    monkeypatch.setattr("joblib.load", fail_model_load)

    response = client.get("/api/predictions/next-race")

    assert response.status_code == 200
    assert response.json()["predictions"]
    assert "app.models.predict" not in sys.modules


def test_missing_prediction_json_returns_clear_server_error(client, monkeypatch, tmp_path):
    missing_file = tmp_path / "missing_predictions.json"
    monkeypatch.setattr(predictions, "_JSON_PATH", str(missing_file))

    response = client.get("/api/predictions/next-race")

    assert response.status_code == 500
    assert response.json()["detail"] == "Prediction data file is missing."
    assert response.headers["content-type"].startswith("application/json")


def test_invalid_prediction_json_returns_clear_server_error(client, monkeypatch, tmp_path):
    invalid_file = tmp_path / "barcelona_catalunya_predictions.json"
    invalid_file.write_text("{not valid json", encoding="utf-8")
    monkeypatch.setattr(predictions, "_JSON_PATH", str(invalid_file))

    response = client.get("/api/predictions/next-race")

    assert response.status_code == 500
    assert response.json()["detail"] == "Prediction data file is malformed."
    assert response.headers["content-type"].startswith("application/json")
