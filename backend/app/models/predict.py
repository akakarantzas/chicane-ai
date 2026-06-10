from pathlib import Path

import joblib
import pandas as pd

_MODEL_PATH = Path(__file__).resolve().parent / "rf_model.pkl"
_model = None

FEATURES = [
    "grid",
    "driver_win_rate",
    "constructor_avg_points",
    "driver_avg_finish_last3",
    "driver_monaco_races",
    "constructor_monaco_win_rate",
    "constructor_recent_points",
    "qualifying_position",
    "grid_gap_to_pole",
    "pit_stop_count",
    "avg_lap_time",
]


def get_model():
    """Lazily load the optional sklearn model used by future inference helpers."""
    global _model
    if _model is None:
        try:
            _model = joblib.load(_MODEL_PATH)
        except FileNotFoundError as exc:
            raise RuntimeError(
                f"Model file not found at {_MODEL_PATH}. Ensure rf_model.pkl is present."
            ) from exc
    return _model


def get_predictions(drivers: list[dict]) -> list[dict]:
    """Run optional model inference.

    The active `/api/predictions/next-race` route serves a precomputed
    prediction JSON; this helper is kept for explicit/future model
    inference and loads `rf_model.pkl` only when called.
    """
    names = [d["driver"] for d in drivers]
    df = pd.DataFrame(drivers)[FEATURES]
    probabilities = get_model().predict_proba(df)[:, 1]

    results = [
        {"driver": name, "probability": round(float(prob), 4)}
        for name, prob in zip(names, probabilities)
    ]
    return sorted(results, key=lambda x: x["probability"], reverse=True)
