from fastapi import APIRouter, HTTPException
import json
from json import JSONDecodeError
from pathlib import Path

from app.data.drivers import PREDICTION_DRIVER_GRID_2026

router = APIRouter(prefix="/api/predictions")

_JSON_PATH = Path(__file__).resolve().parent.parent / "models" / "miami_predictions.json"


def _load_predictions():
    try:
        with Path(_JSON_PATH).open("r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        raise HTTPException(
            status_code=500,
            detail="Prediction data file is missing.",
        )
    except JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="Prediction data file is malformed.",
        )


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

@router.get("/next-race")
def get_next_race_prediction():
    predictions = _complete_2026_grid(_load_predictions())
    return {
        "race": "Miami GP",
        "circuit": "Miami International Autodrome",
        "predictions": predictions,
        "model_version": "2.0",
        "status": "Pre-Qualifying"
    }
