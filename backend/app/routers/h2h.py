import os
import json
from urllib.parse import urlencode
from urllib.request import urlopen

import fastf1
from fastapi import APIRouter, HTTPException

from app.data.drivers import DRIVER_ROSTER_2026
from app.services.h2h_logic import (
    build_h2h_prediction,
    build_stats,
    championship_position,
)

router = APIRouter(prefix="/api/h2h")

CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "cache")
os.makedirs(CACHE_DIR, exist_ok=True)
fastf1.Cache.enable_cache(CACHE_DIR)

RACES_BY_YEAR = {
    2024: [
        "Bahrain", "Saudi Arabia", "Australia", "Japan", "China",
        "Miami", "Emilia Romagna", "Monaco", "Canada", "Spain",
        "Austria", "Great Britain", "Hungary", "Belgium",
        "Netherlands", "Italy", "Azerbaijan", "Singapore",
        "United States", "Mexico City", "São Paulo", "Las Vegas",
        "Qatar", "Abu Dhabi",
    ],
    2025: [
        "Australia", "China", "Japan", "Bahrain", "Saudi Arabia",
        "Miami", "Emilia Romagna", "Monaco", "Canada", "Spain",
        "Austria", "Great Britain", "Belgium", "Hungary",
        "Netherlands", "Italy", "Azerbaijan", "Singapore",
        "United States", "Mexico City", "São Paulo", "Las Vegas",
        "Qatar", "Abu Dhabi",
    ],
    2026: ["Australia", "China", "Japan"],
}

NEXT_RACE = "Miami Grand Prix"
OPENF1_BASE_URL = "https://api.openf1.org/v1"
JOLPICA_BASE_URL = "https://api.jolpi.ca/ergast/f1"

DRIVER_NUMBER_TO_ABBREV = {
    meta["number"]: abbrev
    for abbrev, meta in DRIVER_ROSTER_2026.items()
}


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
    if year not in RACES_BY_YEAR:
        raise HTTPException(status_code=400, detail=f"Unsupported year: {year}")
    return year


def _fetch_json(url: str, timeout: int = 8):
    with urlopen(url, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def _append_unique_rows(target: list[dict], rows: list[dict]) -> None:
    seen = {
        (r["year"], r["race"], r["abbreviation"].upper())
        for r in target
    }
    for row in rows:
        key = (row["year"], row["race"], row["abbreviation"].upper())
        if key not in seen:
            target.append(row)
            seen.add(key)


def _normalise_position(value):
    if value in (None, "", "\\N"):
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def _normalise_points(value) -> float:
    if value in (None, "", "\\N"):
        return 0.0
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _roster_meta_by_number(driver_number) -> dict | None:
    abbrev = DRIVER_NUMBER_TO_ABBREV.get(str(driver_number))
    return DRIVER_ROSTER_2026.get(abbrev) if abbrev else None


def _load_fastf1_results(year: int, race_names: list[str], strict: bool) -> list[dict]:
    rows = []
    for name in race_names:
        try:
            session = fastf1.get_session(year, name, "R")
            session.load(laps=False, telemetry=False, weather=False, messages=False)
            results = session.results
            for _, row in results.iterrows():
                rows.append({
                    "abbreviation": str(row.get("Abbreviation", "")).upper(),
                    "full_name": f"{row.get('FirstName', '')} {row.get('LastName', '')}".strip(),
                    "team": row.get("TeamName", ""),
                    "number": str(row.get("DriverNumber", "")),
                    "position": _normalise_position(row.get("Position")),
                    "points": _normalise_points(row.get("Points", 0)),
                    "race": name,
                    "year": year,
                    "source": "fastf1",
                })
        except Exception as exc:
            if strict and not rows:
                # Keep trying external sources before surfacing a hard failure.
                continue
    return rows


def _load_openf1_results(year: int) -> list[dict]:
    sessions_url = f"{OPENF1_BASE_URL}/sessions?{urlencode({'year': year, 'session_name': 'Race'})}"
    sessions = _fetch_json(sessions_url)
    rows = []

    for session in sessions:
        session_key = session.get("session_key")
        if not session_key:
            continue

        results_url = f"{OPENF1_BASE_URL}/session_result?{urlencode({'session_key': session_key})}"
        drivers_url = f"{OPENF1_BASE_URL}/drivers?{urlencode({'session_key': session_key})}"
        results = _fetch_json(results_url)
        drivers = _fetch_json(drivers_url)
        drivers_by_number = {
            str(driver.get("driver_number")): driver
            for driver in drivers
        }

        race_name = (
            session.get("meeting_name")
            or session.get("location")
            or session.get("country_name")
            or f"Round {session.get('meeting_key', session_key)}"
        )

        for result in results:
            driver_number = str(result.get("driver_number", ""))
            driver = drivers_by_number.get(driver_number, {})
            roster_meta = _roster_meta_by_number(driver_number) or {}
            abbreviation = (
                driver.get("name_acronym")
                or DRIVER_NUMBER_TO_ABBREV.get(driver_number)
                or ""
            ).upper()
            if not abbreviation:
                continue

            rows.append({
                "abbreviation": abbreviation,
                "full_name": driver.get("full_name") or roster_meta.get("full_name") or abbreviation,
                "team": driver.get("team_name") or roster_meta.get("team") or "",
                "number": driver_number,
                "position": _normalise_position(result.get("position")),
                "points": 0.0,
                "race": race_name,
                "year": year,
                "source": "openf1",
            })

    return rows


def _load_jolpica_results(year: int) -> list[dict]:
    url = f"{JOLPICA_BASE_URL}/{year}/results.json?limit=1000"
    data = _fetch_json(url)
    races = (
        data.get("MRData", {})
        .get("RaceTable", {})
        .get("Races", [])
    )
    rows = []

    for race in races:
        race_name = race.get("raceName") or f"Round {race.get('round', '')}".strip()
        for result in race.get("Results", []):
            driver = result.get("Driver", {})
            constructor = result.get("Constructor", {})
            number = str(driver.get("permanentNumber") or result.get("number") or "")
            roster_meta = _roster_meta_by_number(number) or {}
            abbreviation = (
                driver.get("code")
                or DRIVER_NUMBER_TO_ABBREV.get(number)
                or ""
            ).upper()
            if not abbreviation:
                continue

            rows.append({
                "abbreviation": abbreviation,
                "full_name": (
                    f"{driver.get('givenName', '')} {driver.get('familyName', '')}".strip()
                    or roster_meta.get("full_name")
                    or abbreviation
                ),
                "team": constructor.get("name") or roster_meta.get("team") or "",
                "number": number,
                "position": _normalise_position(result.get("position")),
                "points": _normalise_points(result.get("points")),
                "race": race_name,
                "year": year,
                "source": "jolpica",
            })

    return rows


def _load_results(year: int, strict: bool = True) -> list[dict]:
    """Load race results for a season from FastF1, OpenF1 and Jolpica."""
    race_names = RACES_BY_YEAR.get(year)
    if not race_names:
        if strict:
            raise HTTPException(status_code=404, detail=f"No race list configured for year {year}")
        return []

    rows = []
    source_errors = []

    try:
        _append_unique_rows(rows, _load_fastf1_results(year, race_names, strict))
    except Exception as exc:
        source_errors.append(str(exc))

    if rows and year < 2026:
        return rows

    for loader in (
        lambda: _load_jolpica_results(year),
        lambda: _load_openf1_results(year),
    ):
        try:
            _append_unique_rows(rows, loader())
        except Exception as exc:
            source_errors.append(str(exc))

    if strict and not rows:
        detail = f"No H2H race results found for {year}"
        if source_errors:
            detail += f". Sources failed: {'; '.join(source_errors[:3])}"
        raise HTTPException(status_code=502, detail=detail)

    return rows


@router.get("/predict")
def predict_h2h(driver1: str, driver2: str):
    abbrev1, abbrev2 = _validate_driver_pair(driver1, driver2)

    all_rows: list[dict] = []
    for year in sorted(RACES_BY_YEAR.keys()):
        all_rows.extend(_load_results(year, strict=False))

    return build_h2h_prediction(all_rows, abbrev1, abbrev2, NEXT_RACE)


@router.get("/compare")
def compare_drivers(driver1: str, driver2: str, year: int = 2026):
    abbrev1, abbrev2 = _validate_driver_pair(driver1, driver2)
    year = _validate_year(year)

    rows = _load_results(year)

    stats1 = build_stats(rows, abbrev1)
    stats2 = build_stats(rows, abbrev2)

    stats1["champ_position"] = championship_position(rows, abbrev1)
    stats2["champ_position"] = championship_position(rows, abbrev2)

    return {
        "year": year,
        "driver1": stats1,
        "driver2": stats2,
    }
