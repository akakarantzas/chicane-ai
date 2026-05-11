from fastapi import APIRouter
import json
import os

from app.data.drivers import PREDICTION_DRIVER_GRID_2026

router = APIRouter(prefix="/api/predictions")

_JSON_PATH = os.path.join(os.path.dirname(__file__), '..', 'models', 'miami_predictions.json')


def _load_predictions():
    try:
        with open(_JSON_PATH, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return []


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
