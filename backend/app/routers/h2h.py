import logging
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query

from app.data.drivers import DRIVER_ROSTER_2026
from app.services import h2h_providers
from app.services.h2h_cache import get_season_snapshot
from app.services.h2h_quality import snapshot_quality
from app.services.h2h_uncertainty import apply_data_uncertainty
from app.services.h2h_monitor import capture_prediction, monitoring_summary
from app.services.h2h_results import reconcile_results
from app.services.h2h_standings import load_standings
from app.services.h2h_schedule import (
    HISTORY_YEARS, SEASON, get_season_schedule, next_race, utc_now,
)
from app.services.h2h_logic import (
    build_h2h_prediction,
    build_stats,
)

router = APIRouter(prefix="/api/h2h")
logger = logging.getLogger(__name__)
DriverCode = Annotated[str, Query(min_length=1, max_length=16)]
SnapshotID = Annotated[str | None, Query(max_length=32, pattern=r"^[a-f0-9]{32}$")]


def _normalise_driver_code(value: str) -> str:
    return value.strip().upper()


def _validate_driver_code(value: str, label: str) -> str:
    code = _normalise_driver_code(value)
    if code not in DRIVER_ROSTER_2026:
        raise HTTPException(status_code=400, detail=f"Unknown {label}.")
    return code


def _validate_driver_pair(driver1: str, driver2: str) -> tuple[str, str]:
    abbrev1 = _validate_driver_code(driver1, "driver1")
    abbrev2 = _validate_driver_code(driver2, "driver2")
    if abbrev1 == abbrev2:
        raise HTTPException(status_code=400, detail="Drivers must be different.")
    return abbrev1, abbrev2


def _validate_year(year: int) -> int:
    if year not in HISTORY_YEARS:
        raise HTTPException(status_code=400, detail=f"Unsupported year: {year}")
    return year


def _load_results(year: int, strict: bool = True) -> list[dict]:
    """Load race results for a season from FastF1, Jolpica and OpenF1."""
    _validate_year(year)
    events = [event for event in get_season_schedule(year) if event.results_due(utc_now())]
    if not events:
        return []

    rows = []
    providers = (
        ("fastf1", lambda: h2h_providers.load_fastf1_results(year, events, strict)),
        ("jolpica", lambda: h2h_providers.load_jolpica_results(year)),
        ("openf1", lambda: h2h_providers.load_openf1_results(year)),
    )
    for provider, loader in providers:
        try:
            rows.extend(loader())
        except Exception as exc:
            logger.warning(
                "H2H provider request failed provider=%s operation=load_season_results "
                "year=%s error_type=%s",
                provider, year, type(exc).__name__,
            )

    rows = reconcile_results(rows, events)
    if strict and not rows:
        detail = f"No H2H race results found for {year}"
        raise HTTPException(status_code=502, detail=detail)

    return rows


@router.get("/predict")
def predict_h2h(driver1: DriverCode, driver2: DriverCode, snapshot_id: SnapshotID = None):
    # Keep this handler sync: FastAPI runs sync endpoints in a threadpool, and
    # the expensive season loads are additionally guarded by the in-process cache.
    abbrev1, abbrev2 = _validate_driver_pair(driver1, driver2)

    now = utc_now()
    current_events = get_season_schedule(SEASON)
    event, schedule_status = next_race(current_events, now)
    if event is None:
        result = build_h2h_prediction([], abbrev1, abbrev2, None)
        result.update({
            "prediction_status": schedule_status,
            "reasoning": "No upcoming Grand Prix is listed for this season."
            if schedule_status == "no_upcoming_race" else "The next race start time is not confirmed.",
            "next_event": None,
            "monitoring": {"status": "not_recorded", "reason": "no_confirmed_target"},
        })
        return result

    all_rows: list[dict] = []
    coverage = {}
    snapshots = {}
    pinned = get_season_snapshot(SEASON, current_events, now, _load_snapshot,
                                 snapshot_id=snapshot_id) if snapshot_id else None
    for year in HISTORY_YEARS:
        try:
            events = get_season_schedule(year)
            snapshot = pinned if year == SEASON and pinned else get_season_snapshot(year, events, now, _load_snapshot)
        except HTTPException as exc:
            if exc.status_code == 409:
                raise
            coverage[str(year)] = {"status": "unavailable"}
            snapshots[str(year)] = {"freshness": {"status": "unavailable"}}
            continue
        all_rows.extend(snapshot["rows"])
        coverage[str(year)] = snapshot["coverage"]
        snapshots[str(year)] = {"freshness": snapshot["freshness"],
                                "quality": snapshot_quality(snapshot, (abbrev1, abbrev2))}

    result = build_h2h_prediction(all_rows, abbrev1, abbrev2, event.name, target_event=event)
    result.update({"next_event": event.public(), "coverage": coverage, "snapshots": snapshots})
    result = apply_data_uncertainty(result, snapshots, coverage, SEASON)
    result["monitoring"] = capture_prediction(result, all_rows, event, abbrev1, abbrev2, utc_now())
    return result


@router.get("/monitoring")
def h2h_monitoring():
    # Read-only summary: viewing monitoring never fetches results or logs forecasts.
    return monitoring_summary()


@router.get("/compare")
def compare_drivers(driver1: DriverCode, driver2: DriverCode, year: int = SEASON):
    # Keep this handler sync for the same reason as /predict.
    abbrev1, abbrev2 = _validate_driver_pair(driver1, driver2)
    year = _validate_year(year)

    events = get_season_schedule(year)
    snapshot = get_season_snapshot(year, events, utc_now(), _load_snapshot)
    rows, standings = snapshot["rows"], snapshot["standings"]
    stats1 = build_stats(rows, abbrev1, standings=standings)
    stats2 = build_stats(rows, abbrev2, standings=standings)

    return {
        "year": year,
        "scope": "season",
        "coverage": snapshot["coverage"],
        "freshness": snapshot["freshness"],
        "quality": snapshot_quality(snapshot, (abbrev1, abbrev2)),
        "standings": {key: value for key, value in standings.items() if key != "drivers"},
        "driver1": stats1,
        "driver2": stats2,
    }


def _load_standings(year, events, now):
    return load_standings(year, events, now, h2h_providers.fetch_json)


def _load_snapshot(year, events, now):
    try:
        rows = _load_results(year, strict=True)
    except HTTPException as exc:
        if exc.status_code != 502:
            raise
        rows = []
    return {"rows": rows, "standings": _load_standings(year, events, now)}
