from fastapi import APIRouter, HTTPException
from app.models.predict import get_predictions

router = APIRouter(prefix="/api/predictions")

_SAMPLE_DRIVERS = [
    {"driver": "verstappen", "grid": 1, "driver_win_rate": 0.35, "constructor_avg_points": 18.5, "driver_avg_finish_last3": 2.1, "driver_monaco_races": 6,  "constructor_monaco_win_rate": 0.30, "constructor_recent_points": 55.0, "qualifying_position": 1, "grid_gap_to_pole": 0.0, "pit_stop_count": 2, "avg_lap_time": 75000},
    {"driver": "leclerc",    "grid": 2, "driver_win_rate": 0.18, "constructor_avg_points": 14.2, "driver_avg_finish_last3": 3.4, "driver_monaco_races": 5,  "constructor_monaco_win_rate": 0.25, "constructor_recent_points": 42.0, "qualifying_position": 2, "grid_gap_to_pole": 0.1, "pit_stop_count": 2, "avg_lap_time": 75200},
    {"driver": "norris",     "grid": 3, "driver_win_rate": 0.15, "constructor_avg_points": 16.0, "driver_avg_finish_last3": 4.1, "driver_monaco_races": 4,  "constructor_monaco_win_rate": 0.10, "constructor_recent_points": 48.0, "qualifying_position": 3, "grid_gap_to_pole": 0.2, "pit_stop_count": 2, "avg_lap_time": 75400},
    {"driver": "piastri",    "grid": 4, "driver_win_rate": 0.12, "constructor_avg_points": 16.0, "driver_avg_finish_last3": 4.8, "driver_monaco_races": 2,  "constructor_monaco_win_rate": 0.10, "constructor_recent_points": 48.0, "qualifying_position": 4, "grid_gap_to_pole": 0.3, "pit_stop_count": 2, "avg_lap_time": 75600},
    {"driver": "russell",    "grid": 5, "driver_win_rate": 0.08, "constructor_avg_points": 10.5, "driver_avg_finish_last3": 5.2, "driver_monaco_races": 3,  "constructor_monaco_win_rate": 0.05, "constructor_recent_points": 31.0, "qualifying_position": 5, "grid_gap_to_pole": 0.5, "pit_stop_count": 2, "avg_lap_time": 75800},
    {"driver": "hamilton",   "grid": 6, "driver_win_rate": 0.30, "constructor_avg_points": 14.2, "driver_avg_finish_last3": 5.8, "driver_monaco_races": 16, "constructor_monaco_win_rate": 0.25, "constructor_recent_points": 42.0, "qualifying_position": 6, "grid_gap_to_pole": 0.6, "pit_stop_count": 2, "avg_lap_time": 76000},
    {"driver": "sainz",      "grid": 7, "driver_win_rate": 0.10, "constructor_avg_points": 10.5, "driver_avg_finish_last3": 6.1, "driver_monaco_races": 7,  "constructor_monaco_win_rate": 0.05, "constructor_recent_points": 31.0, "qualifying_position": 7, "grid_gap_to_pole": 0.7, "pit_stop_count": 2, "avg_lap_time": 76200},
    {"driver": "alonso",     "grid": 8, "driver_win_rate": 0.22, "constructor_avg_points":  6.0, "driver_avg_finish_last3": 7.2, "driver_monaco_races": 20, "constructor_monaco_win_rate": 0.15, "constructor_recent_points": 18.0, "qualifying_position": 8, "grid_gap_to_pole": 0.9, "pit_stop_count": 2, "avg_lap_time": 76400},
]


@router.get("/next-race")
def get_next_race_prediction():
    try:
        predictions = get_predictions(_SAMPLE_DRIVERS)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    return {
        "race": "TBD",
        "circuit": "TBD",
        "predictions": predictions,
        "model_version": "1.0",
        "status": "ok",
    }
