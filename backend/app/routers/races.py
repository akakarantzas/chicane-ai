from fastapi import APIRouter

router = APIRouter(prefix="/api/races")


@router.get("/")
def get_races():
    return {
        "season": 2025,
        "races": [],
    }
