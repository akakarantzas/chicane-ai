from fastapi import APIRouter

router = APIRouter(prefix="/api/predictions")


@router.get("/next-race")
def get_next_race_prediction():
    return {
        "race": "TBD",
        "circuit": "TBD",
        "predictions": [],
        "model_version": "1.0",
        "status": "coming_soon",
    }
