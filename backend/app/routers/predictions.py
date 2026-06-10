from fastapi import APIRouter, HTTPException
import json
from json import JSONDecodeError
from pathlib import Path

from pydantic import BaseModel, Field

from app.data.drivers import PREDICTION_DRIVER_GRID_2026

router = APIRouter(prefix="/api/predictions")

_MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
_PREDICTIONS_PATH = _MODELS_DIR / "barcelona_catalunya_predictions.json"
_METADATA_PATH = _MODELS_DIR / "barcelona_catalunya_metadata.json"


class PredictionItem(BaseModel):
    driver: str
    team: str
    probability: float


class PredictionMetadata(BaseModel):
    training_samples: int | None = None
    training_races_loaded: int | None = None
    validation: dict = Field(default_factory=dict)
    prediction_input: dict = Field(default_factory=dict)
    backtest_summary: dict = Field(default_factory=dict)


class NextRacePredictionResponse(BaseModel):
    race: str
    circuit: str
    predictions: list[PredictionItem]
    model_version: str | None = None
    status: str
    metadata: PredictionMetadata


def _load_json(path: Path | str, missing_detail: str, malformed_detail: str):
    try:
        with Path(path).open("r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        raise HTTPException(
            status_code=500,
            detail=missing_detail,
        )
    except JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail=malformed_detail,
        )


def _load_predictions():
    data = _load_json(
        _PREDICTIONS_PATH,
        "Prediction data file is missing.",
        "Prediction data file is malformed.",
    )
    _validate_predictions(data)
    return data


def _load_metadata():
    data = _load_json(
        _METADATA_PATH,
        "Prediction metadata file is missing.",
        "Prediction metadata file is malformed.",
    )
    _validate_metadata(data)
    return data


def _validate_predictions(data):
    if not isinstance(data, list) or not data:
        _raise_invalid_prediction_data()

    for item in data:
        if not isinstance(item, dict):
            _raise_invalid_prediction_data()
        if not isinstance(item.get("driver"), str) or not item["driver"].strip():
            _raise_invalid_prediction_data()
        if not isinstance(item.get("team"), str) or not item["team"].strip():
            _raise_invalid_prediction_data()
        if not isinstance(item.get("probability"), (int, float)):
            _raise_invalid_prediction_data()


def _validate_metadata(data):
    if not isinstance(data, dict):
        _raise_invalid_prediction_metadata()

    for field in ("race", "circuit", "model_version"):
        if not isinstance(data.get(field), str) or not data[field].strip():
            _raise_invalid_prediction_metadata()


def _raise_invalid_prediction_data():
    raise HTTPException(
        status_code=500,
        detail="Prediction data file has invalid structure.",
    )


def _raise_invalid_prediction_metadata():
    raise HTTPException(
        status_code=500,
        detail="Prediction metadata file has invalid structure.",
    )


def _prediction_status(metadata: dict) -> str:
    prediction_input = metadata.get("prediction_input", {})
    if prediction_input.get("grid_source") == "qualifying_grid":
        return "Post-Qualifying"
    return "Pre-Qualifying"


def _public_metadata(metadata: dict) -> dict:
    backtest = metadata.get("backtest", {})
    return {
        "training_samples": metadata.get("training_samples"),
        "training_races_loaded": metadata.get("training_races_loaded"),
        "validation": metadata.get("validation", {}),
        "prediction_input": metadata.get("prediction_input", {}),
        "backtest_summary": backtest.get("summary", {}),
    }


def _complete_2026_grid(predictions: list[dict]) -> list[dict]:
    by_driver = {
        item.get("driver", "").lower(): item
        for item in predictions
        if item.get("driver")
    }

    completed = list(predictions)
    for index, driver in enumerate(PREDICTION_DRIVER_GRID_2026):
        key = driver["driver"].lower()
        if key in by_driver:
            continue

        completed.append({
            "driver": driver["driver"],
            "team": driver["team"],
            "probability": round(max(0.0008, 0.003 - index * 0.00008), 4),
        })

    return sorted(completed, key=lambda item: item.get("probability", 0), reverse=True)

@router.get("/next-race", response_model=NextRacePredictionResponse)
def get_next_race_prediction():
    predictions = _complete_2026_grid(_load_predictions())
    metadata = _load_metadata()
    return {
        "race": metadata.get("race", "Barcelona-Catalunya GP"),
        "circuit": metadata.get("circuit", "Circuit de Barcelona-Catalunya"),
        "predictions": predictions,
        "model_version": metadata.get("model_version"),
        "status": _prediction_status(metadata),
        "metadata": _public_metadata(metadata),
    }
