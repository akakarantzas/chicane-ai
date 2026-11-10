from fastapi import APIRouter, HTTPException, Response
import json
from json import JSONDecodeError
import math
from pathlib import Path

from pydantic import BaseModel, Field

from app.services.prediction_history import history_response, timestamp
from app.services import post_qualifying
from app.services.h2h_schedule import RESULT_DELAY, utc_now

router = APIRouter(prefix="/api/predictions")

_MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
_PREDICTIONS_PATH = _MODELS_DIR / "singapore_predictions.json"
_METADATA_PATH = _MODELS_DIR / "singapore_metadata.json"


class PredictionItem(BaseModel):
    driver: str
    team: str
    probability: float


class PredictionMetadata(BaseModel):
    training_samples: int | None = None
    training_races_loaded: int | None = None
    validation: dict = Field(default_factory=dict)
    prediction_postprocess: dict = Field(default_factory=dict)
    prediction_input: dict = Field(default_factory=dict)
    backtest_summary: dict = Field(default_factory=dict)


class NextRacePredictionResponse(BaseModel):
    race: str
    circuit: str
    predictions: list[PredictionItem]
    model_version: str | None = None
    generated_at: str | None = None
    automatic_update_enabled: bool = False
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
        probability = item.get("probability")
        if (
            not isinstance(probability, (int, float))
            or isinstance(probability, bool)
            or not math.isfinite(probability)
            or probability < 0
            or probability > 1
        ):
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


def _prediction_status(metadata: dict, race_start: str | None = None) -> str:
    # A forecast for a race that is over must not be labelled as upcoming. A
    # post-qualifying update records the exact start; base files only carry the date.
    now = utc_now()
    race_date = metadata.get("race_date")
    if race_start:
        if now >= timestamp(race_start) + RESULT_DELAY:
            return "Race finished"
    elif isinstance(race_date, str) and race_date < now.date().isoformat():
        return "Race finished"
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
        "prediction_postprocess": metadata.get("prediction_postprocess", {}),
        "prediction_input": metadata.get("prediction_input", {}),
        "backtest_summary": backtest.get("summary", {}),
    }


@router.get("/next-race", response_model=NextRacePredictionResponse)
def get_next_race_prediction(response: Response):
    response.headers["Cache-Control"] = "no-store"
    original_predictions = _load_predictions()
    metadata = _load_metadata()
    update = post_qualifying.read_update(original_predictions, metadata)
    if update:
        original_predictions, metadata = update["predictions"], update["metadata"]
    predictions = sorted(original_predictions, key=lambda item: item["probability"], reverse=True)
    return {
        "race": metadata["race"],
        "circuit": metadata["circuit"],
        "predictions": predictions,
        "model_version": metadata.get("model_version"),
        "generated_at": metadata.get("generated_at"),
        "automatic_update_enabled": post_qualifying.enabled() and post_qualifying.history.enabled(),
        "status": _prediction_status(metadata, update["race_start"] if update else None),
        "metadata": _public_metadata(metadata),
    }


@router.get("/history")
def get_prediction_history(response: Response):
    response.headers["Cache-Control"] = "no-store"
    return history_response()
