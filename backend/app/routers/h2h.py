import os
import json
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import fastf1
from fastapi import APIRouter, HTTPException

from app.data.drivers import DRIVER_ROSTER_2026
from app.services.h2h_cache import get_season_snapshot
from app.services.h2h_quality import snapshot_quality
from app.services.h2h_uncertainty import apply_data_uncertainty
from app.services.h2h_contract import final_position, published_points
from app.services.h2h_results import clean_text, reconcile_results
from app.services.h2h_standings import load_standings
from app.services.h2h_schedule import (
    HISTORY_YEARS, SEASON, USER_AGENT, RaceEvent, get_season_schedule,
    next_race, parse_utc, utc_now,
)
from app.services.h2h_logic import (
    build_h2h_prediction,
    build_stats,
)

router = APIRouter(prefix="/api/h2h")

CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "cache")
_fastf1_cache_enabled = False

OPENF1_BASE_URL = "https://api.openf1.org/v1"
JOLPICA_BASE_URL = "https://api.jolpi.ca/ergast/f1"


def _normalise_driver_code(value: str) -> str:
    return value.strip().upper()


def _validate_driver_code(value: str, label: str) -> str:
    code = _normalise_driver_code(value)
    if code not in DRIVER_ROSTER_2026:
        raise HTTPException(status_code=400, detail=f"Unknown {label}: {value}")
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


def _fetch_json(url: str, timeout: int = 8):
    with urlopen(Request(url, headers={"User-Agent": USER_AGENT}), timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def _normalise_position(value):
    return final_position(value)


def _normalise_points(value) -> float | None:
    return published_points(value)


def _ensure_fastf1_cache_enabled() -> None:
    global _fastf1_cache_enabled
    if _fastf1_cache_enabled:
        return

    os.makedirs(CACHE_DIR, exist_ok=True)
    fastf1.Cache.enable_cache(CACHE_DIR)
    _fastf1_cache_enabled = True


def _published_results(rows: list[dict]) -> bool:
    # A grid or an incomplete live timing table is not a race result. Require a
    # winner and a published finishing status, not just numeric grid positions.
    return any(
        row.get("position") == 1 and str(row.get("status", "")).casefold() == "finished"
        for row in rows
    )


def _load_fastf1_results(year: int, events: list[RaceEvent], strict: bool) -> list[dict]:
    _ensure_fastf1_cache_enabled()

    rows = []
    for event in events:
        if not event.results_due(utc_now()):
            continue
        try:
            session = fastf1.get_session(year, event.round, "R")
            session_date = parse_utc(session.event.get_session_date("R", utc=True))
            if session_date is None or session_date.date() != event.starts_at.date():
                continue
            session.load(laps=False, telemetry=False, weather=False, messages=False)
            results = session.results
            event_rows = []
            for _, row in results.iterrows():
                event_rows.append({
                    "abbreviation": str(row.get("Abbreviation", "")).upper(),
                    "driver_id": clean_text(row.get("DriverId")),
                    "full_name": f"{row.get('FirstName', '')} {row.get('LastName', '')}".strip(),
                    "team": row.get("TeamName", ""),
                    "number": str(row.get("DriverNumber", "")),
                    "position": _normalise_position(row.get("Position")),
                    "status": str(row.get("Status", "")),
                    "classified_position": str(row.get("ClassifiedPosition", "")),
                    "session_type": "Race",
                    "points": _normalise_points(row.get("Points")),
                    "race": event.name,
                    "round": event.round,
                    "race_date": event.starts_at.date().isoformat(),
                    "year": year,
                    "source": "fastf1",
                })
            if _published_results(event_rows):
                rows.extend(event_rows)
        except Exception:
            if strict and not rows:
                # Keep trying external sources before surfacing a hard failure.
                continue
    return rows


def _load_openf1_results(year: int) -> list[dict]:
    now = utc_now()
    events = [event for event in get_season_schedule(year) if event.results_due(now)]
    sessions_url = f"{OPENF1_BASE_URL}/sessions?{urlencode({'year': year, 'session_name': 'Race'})}"
    sessions = _fetch_json(sessions_url)
    rows = []

    for session in sessions:
        session_key = session.get("session_key")
        starts_at = parse_utc(session.get("date_start"))
        ends_at = parse_utc(session.get("date_end"))
        # Require an ended race session and an unambiguous calendar date match.
        if not session_key or starts_at is None or ends_at is None or ends_at > now:
            continue
        matches = [event for event in events if event.starts_at.date() == starts_at.date()]
        if len(matches) != 1:
            continue
        event = matches[0]

        results_url = f"{OPENF1_BASE_URL}/session_result?{urlencode({'session_key': session_key})}"
        drivers_url = f"{OPENF1_BASE_URL}/drivers?{urlencode({'session_key': session_key})}"
        results = _fetch_json(results_url)
        if not any(final_position(result.get("position")) == 1
                   and result.get("dnf") is False and result.get("dns") is False
                   and result.get("dsq") is False for result in results):
            continue
        drivers = _fetch_json(drivers_url)
        drivers_by_number = {}
        ambiguous_numbers = set()
        for driver in drivers:
            number = str(driver.get("driver_number"))
            previous = drivers_by_number.get(number)
            if previous and (
                clean_text(previous.get("name_acronym")).upper()
                != clean_text(driver.get("name_acronym")).upper()
            ):
                ambiguous_numbers.add(number)
            drivers_by_number[number] = driver

        race_name = (
            session.get("meeting_name")
            or session.get("location")
            or session.get("country_name")
            or f"Round {session.get('meeting_key', session_key)}"
        )

        for result in results:
            driver_number = str(result.get("driver_number", ""))
            if driver_number in ambiguous_numbers:
                continue
            driver = drivers_by_number.get(driver_number, {})
            abbreviation = clean_text(driver.get("name_acronym")).upper()
            if not abbreviation:
                continue

            rows.append({
                "abbreviation": abbreviation,
                "full_name": driver.get("full_name") or abbreviation,
                "team": driver.get("team_name") or "",
                "number": driver_number,
                "position": _normalise_position(result.get("position")),
                "dns": result.get("dns") is True,
                "dsq": result.get("dsq") is True,
                "dnf": result.get("dnf") is True,
                "session_type": "Race",
                "points": None,
                "points_available": False,
                "race": race_name,
                "round": event.round,
                "race_date": event.starts_at.date().isoformat(),
                "year": year,
                "source": "openf1",
            })

    return rows


def _jolpica_result_races(year: int) -> list[dict]:
    """Pagination counts driver results, and may split a race across pages."""
    offset = 0
    races_by_round = {}
    while True:
        data = _fetch_json(f"{JOLPICA_BASE_URL}/{year}/results.json?limit=100&offset={offset}")
        meta = data.get("MRData", {})
        races = meta.get("RaceTable", {}).get("Races", [])
        count = sum(len(race.get("Results", [])) for race in races)
        total = int(meta.get("total", offset + count))
        if int(meta.get("offset", offset)) != offset or (not count and offset < total):
            raise ValueError("Incomplete Jolpica result pagination")
        for race in races:
            key = (race.get("round"), race.get("date"))
            combined = races_by_round.setdefault(key, {**race, "Results": []})
            combined["Results"].extend(race.get("Results", []))
        offset += count
        if offset >= total:
            return list(races_by_round.values())


def _load_jolpica_results(year: int) -> list[dict]:
    events = [event for event in get_season_schedule(year) if event.results_due(utc_now())]
    races = _jolpica_result_races(year)
    rows = []

    for race in races:
        result_date = parse_utc(race.get("date"))
        matches = [event for event in events if result_date is not None and event.starts_at.date() == result_date.date()]
        if len(matches) != 1:
            continue
        event = matches[0]
        race_name = race.get("raceName") or f"Round {race.get('round', '')}".strip()
        event_rows = []
        for result in race.get("Results", []):
            driver = result.get("Driver", {})
            constructor = result.get("Constructor", {})
            number = str(result.get("number") or driver.get("permanentNumber") or "")
            abbreviation = clean_text(driver.get("code")).upper()
            if not abbreviation:
                continue

            event_rows.append({
                "abbreviation": abbreviation,
                "driver_id": clean_text(driver.get("driverId")),
                "full_name": (
                    f"{driver.get('givenName', '')} {driver.get('familyName', '')}".strip()
                    or abbreviation
                ),
                "team": constructor.get("name") or "",
                "number": number,
                "position": _normalise_position(result.get("position")),
                "status": result.get("status"),
                "classified_position": result.get("positionText"),
                "session_type": "Race",
                "points": _normalise_points(result.get("points")),
                "race": race_name,
                "round": event.round,
                "race_date": event.starts_at.date().isoformat(),
                "year": year,
                "source": "jolpica",
            })
        if _published_results(event_rows):
            rows.extend(event_rows)

    return rows


def _load_results(year: int, strict: bool = True) -> list[dict]:
    """Load race results for a season from FastF1, OpenF1 and Jolpica."""
    _validate_year(year)
    events = [event for event in get_season_schedule(year) if event.results_due(utc_now())]
    if not events:
        return []

    rows = []
    source_errors = []

    try:
        rows.extend(_load_fastf1_results(year, events, strict))
    except Exception as exc:
        source_errors.append(str(exc))

    for loader in (
        lambda: _load_jolpica_results(year),
        lambda: _load_openf1_results(year),
    ):
        try:
            rows.extend(loader())
        except Exception as exc:
            source_errors.append(str(exc))

    rows = reconcile_results(rows, events)
    if strict and not rows:
        detail = f"No H2H race results found for {year}"
        if source_errors:
            detail += f". Sources failed: {'; '.join(source_errors[:3])}"
        raise HTTPException(status_code=502, detail=detail)

    return rows


@router.get("/predict")
def predict_h2h(driver1: str, driver2: str, snapshot_id: str | None = None):
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
    return apply_data_uncertainty(result, snapshots, coverage, SEASON)


@router.get("/compare")
def compare_drivers(driver1: str, driver2: str, year: int = SEASON):
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
    return load_standings(year, events, now, _fetch_json)


def _load_snapshot(year, events, now):
    try:
        rows = _load_results(year, strict=True)
    except HTTPException as exc:
        if exc.status_code != 502:
            raise
        rows = []
    return {"rows": rows, "standings": _load_standings(year, events, now)}
