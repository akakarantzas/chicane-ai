from fastapi import APIRouter, HTTPException
import json
import os

router = APIRouter(prefix="/api/predictions")

_JSON_PATH = os.path.join(os.path.dirname(__file__), '..', 'models', 'miami_predictions.json')

_DRIVER_ROSTER_2026 = [
    {"driver": "Norris", "team": "McLaren"},
    {"driver": "Piastri", "team": "McLaren"},
    {"driver": "Russell", "team": "Mercedes"},
    {"driver": "Antonelli", "team": "Mercedes"},
    {"driver": "Verstappen", "team": "Red Bull Racing"},
    {"driver": "Hadjar", "team": "Red Bull Racing"},
    {"driver": "Leclerc", "team": "Ferrari"},
    {"driver": "Hamilton", "team": "Ferrari"},
    {"driver": "Albon", "team": "Williams"},
    {"driver": "Sainz", "team": "Williams"},
    {"driver": "Lindblad", "team": "Racing Bulls"},
    {"driver": "Lawson", "team": "Racing Bulls"},
    {"driver": "Stroll", "team": "Aston Martin"},
    {"driver": "Alonso", "team": "Aston Martin"},
    {"driver": "Ocon", "team": "Haas"},
    {"driver": "Bearman", "team": "Haas"},
    {"driver": "Hulkenberg", "team": "Audi"},
    {"driver": "Bortoleto", "team": "Audi"},
    {"driver": "Gasly", "team": "Alpine"},
    {"driver": "Colapinto", "team": "Alpine"},
    {"driver": "Perez", "team": "Cadillac"},
    {"driver": "Bottas", "team": "Cadillac"},
]


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
    for index, driver in enumerate(_DRIVER_ROSTER_2026):
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
