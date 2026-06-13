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
    assert data["model_version"] == "barcelona-catalunya-hgb-calibrated-1.4"
    assert data["status"] == "Pre-Qualifying"
    assert data["metadata"]["prediction_input"]["grid_source"] == "projected_grid"
    assert data["metadata"]["backtest_summary"]["top3_accuracy"] == pytest.approx(1.0)
    assert isinstance(data["predictions"], list)
    assert data["predictions"]

    postprocess = data["metadata"]["prediction_postprocess"]
    assert postprocess["prediction_only_prior_weights"]["recent_dominance"] == pytest.approx(0.075)
    assert postprocess["contender_probability_mass"] == pytest.approx(0.93)
    assert postprocess["win_contenders"] == ["ANT", "HAM", "LEC", "NOR", "PIA", "RUS", "VER"]
    assert postprocess["market_odds"]["market_odds_file"] == "market_odds.json"
    assert postprocess["market_odds"]["drivers"] == ["ANT"]
    assert postprocess["market_odds"]["book_overround"] == pytest.approx(0.5)

    antonelli = next(
        item for item in data["predictions"] if item["driver"] == "Antonelli"
    )
    assert antonelli["team"] == "Mercedes"
    assert antonelli["probability"] == pytest.approx(0.3293)


def test_next_race_predictions_use_json_without_model_import(client, monkeypatch):
    sys.modules.pop("app.models.predict", None)

    def fail_model_load(path):
        raise AssertionError("JSON prediction endpoint should not load a pickle model")

    monkeypatch.setattr("joblib.load", fail_model_load)

    response = client.get("/api/predictions/next-race")

    assert response.status_code == 200
    assert response.json()["predictions"]
    assert "app.models.predict" not in sys.modules


def test_next_race_predictions_openapi_uses_response_schema(client):
    response = client.get("/openapi.json")

    assert response.status_code == 200
    schema = response.json()
    next_race_response = schema["paths"]["/api/predictions/next-race"]["get"]["responses"]["200"]
    assert next_race_response["content"]["application/json"]["schema"]["$ref"] == (
        "#/components/schemas/NextRacePredictionResponse"
    )

    response_schema = schema["components"]["schemas"]["NextRacePredictionResponse"]
    assert response_schema["required"] == [
        "race",
        "circuit",
        "predictions",
        "status",
        "metadata",
    ]
    assert response_schema["properties"]["predictions"]["items"]["$ref"] == (
        "#/components/schemas/PredictionItem"
    )


def test_missing_prediction_json_returns_clear_server_error(client, monkeypatch, tmp_path):
    missing_file = tmp_path / "missing_predictions.json"
    monkeypatch.setattr(predictions, "_PREDICTIONS_PATH", str(missing_file))

    response = client.get("/api/predictions/next-race")

    assert response.status_code == 500
    assert response.json()["detail"] == "Prediction data file is missing."
    assert response.headers["content-type"].startswith("application/json")


def test_invalid_prediction_json_returns_clear_server_error(client, monkeypatch, tmp_path):
    invalid_file = tmp_path / "barcelona_catalunya_predictions.json"
    invalid_file.write_text("{not valid json", encoding="utf-8")
    monkeypatch.setattr(predictions, "_PREDICTIONS_PATH", str(invalid_file))

    response = client.get("/api/predictions/next-race")

    assert response.status_code == 500
    assert response.json()["detail"] == "Prediction data file is malformed."
    assert response.headers["content-type"].startswith("application/json")


def test_invalid_prediction_json_structure_returns_clear_server_error(client, monkeypatch, tmp_path):
    invalid_file = tmp_path / "barcelona_catalunya_predictions.json"
    invalid_file.write_text('[{"driver": "Antonelli", "probability": 0.27}]', encoding="utf-8")
    monkeypatch.setattr(predictions, "_PREDICTIONS_PATH", str(invalid_file))

    response = client.get("/api/predictions/next-race")

    assert response.status_code == 500
    assert response.json()["detail"] == "Prediction data file has invalid structure."
    assert response.headers["content-type"].startswith("application/json")


@pytest.mark.parametrize("probability", [-0.1, 1.1, True])
def test_invalid_prediction_probability_returns_clear_server_error(
    client, monkeypatch, tmp_path, probability
):
    invalid_file = tmp_path / "barcelona_catalunya_predictions.json"
    payload = (
        '[{"driver": "Antonelli", '
        '"team": "Mercedes", '
        f'"probability": {str(probability).lower()}}}]'
    )
    invalid_file.write_text(payload, encoding="utf-8")
    monkeypatch.setattr(predictions, "_PREDICTIONS_PATH", str(invalid_file))

    response = client.get("/api/predictions/next-race")

    assert response.status_code == 500
    assert response.json()["detail"] == "Prediction data file has invalid structure."
    assert response.headers["content-type"].startswith("application/json")


def test_missing_prediction_metadata_returns_clear_server_error(client, monkeypatch, tmp_path):
    missing_file = tmp_path / "missing_metadata.json"
    monkeypatch.setattr(predictions, "_METADATA_PATH", str(missing_file))

    response = client.get("/api/predictions/next-race")

    assert response.status_code == 500
    assert response.json()["detail"] == "Prediction metadata file is missing."
    assert response.headers["content-type"].startswith("application/json")


def test_invalid_prediction_metadata_returns_clear_server_error(client, monkeypatch, tmp_path):
    invalid_file = tmp_path / "barcelona_catalunya_metadata.json"
    invalid_file.write_text("{not valid json", encoding="utf-8")
    monkeypatch.setattr(predictions, "_METADATA_PATH", str(invalid_file))

    response = client.get("/api/predictions/next-race")

    assert response.status_code == 500
    assert response.json()["detail"] == "Prediction metadata file is malformed."
    assert response.headers["content-type"].startswith("application/json")


def test_invalid_prediction_metadata_structure_returns_clear_server_error(client, monkeypatch, tmp_path):
    invalid_file = tmp_path / "barcelona_catalunya_metadata.json"
    invalid_file.write_text('{"race": "Barcelona-Catalunya GP"}', encoding="utf-8")
    monkeypatch.setattr(predictions, "_METADATA_PATH", str(invalid_file))

    response = client.get("/api/predictions/next-race")

    assert response.status_code == 500
    assert response.json()["detail"] == "Prediction metadata file has invalid structure."
    assert response.headers["content-type"].startswith("application/json")
