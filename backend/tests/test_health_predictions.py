import pytest

from app.routers import predictions


def test_health_check(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_next_race_predictions_preserve_current_miami_values(client):
    response = client.get("/api/predictions/next-race")

    assert response.status_code == 200
    data = response.json()
    assert {"race", "circuit", "predictions", "model_version", "status"} <= set(data)
    assert isinstance(data["predictions"], list)
    assert data["predictions"]

    antonelli = next(
        item for item in data["predictions"] if item["driver"] == "Antonelli"
    )
    assert antonelli["team"] == "Mercedes"
    assert antonelli["probability"] == pytest.approx(0.7091)


def test_missing_prediction_json_returns_clear_server_error(client, monkeypatch, tmp_path):
    missing_file = tmp_path / "missing_predictions.json"
    monkeypatch.setattr(predictions, "_JSON_PATH", str(missing_file))

    response = client.get("/api/predictions/next-race")

    assert response.status_code == 500
    assert response.json()["detail"] == "Prediction data file is missing."
    assert response.headers["content-type"].startswith("application/json")


def test_invalid_prediction_json_returns_clear_server_error(client, monkeypatch, tmp_path):
    invalid_file = tmp_path / "miami_predictions.json"
    invalid_file.write_text("{not valid json", encoding="utf-8")
    monkeypatch.setattr(predictions, "_JSON_PATH", str(invalid_file))

    response = client.get("/api/predictions/next-race")

    assert response.status_code == 500
    assert response.json()["detail"] == "Prediction data file is malformed."
    assert response.headers["content-type"].startswith("application/json")
