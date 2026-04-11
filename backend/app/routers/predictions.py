from fastapi import APIRouter, HTTPException
import json
import os

router = APIRouter(prefix="/api/predictions")

_JSON_PATH = os.path.join(os.path.dirname(__file__), '..', 'models', 'miami_predictions.json')

def _load_predictions():
    try:
        with open(_JSON_PATH, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return []

@router.get("/next-race")
def get_next_race_prediction():
    predictions = _load_predictions()
    return {
        "race": "Miami Grand Prix",
        "circuit": "Miami International Autodrome",
        "predictions": predictions,
        "model_version": "2.0",
        "status": "pre-qualifying"
    }
