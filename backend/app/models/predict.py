import os
import joblib
import pandas as pd

_MODEL_PATH = os.path.join(os.path.dirname(__file__), "rf_model.pkl")

try:
    _model = joblib.load(_MODEL_PATH)
except FileNotFoundError:
    raise RuntimeError(f"Model file not found at {_MODEL_PATH}. Ensure rf_model.pkl is present.")

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


def get_predictions(drivers: list[dict]) -> list[dict]:
    """
    Args:
        drivers: list of dicts, each with a "driver" key plus all 11 feature keys.
    Returns:
        Sorted list of {"driver": str, "probability": float} dicts, highest probability first.
    """
    names = [d["driver"] for d in drivers]
    df = pd.DataFrame(drivers)[FEATURES]
    probabilities = _model.predict_proba(df)[:, 1]

    results = [
        {"driver": name, "probability": round(float(prob), 4)}
        for name, prob in zip(names, probabilities)
    ]
    return sorted(results, key=lambda x: x["probability"], reverse=True)
