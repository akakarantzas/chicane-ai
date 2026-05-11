import os
import json
from urllib.parse import urlencode
from urllib.request import urlopen

import fastf1
from fastapi import APIRouter, HTTPException

from app.data.drivers import DRIVER_ROSTER_2026

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


def _empty_stats(abbrev: str) -> dict:
    meta = DRIVER_ROSTER_2026.get(abbrev.upper())
    if not meta:
        raise HTTPException(status_code=404, detail=f"Driver '{abbrev}' not found in 2026 roster")

    return {
        "abbreviation": abbrev.upper(),
        "full_name": meta["full_name"],
        "team": meta["team"],
        "number": meta["number"],
        "wins": 0,
        "podiums": 0,
        "points": 0,
        "races": 0,
        "best_finish": None,
        "avg_finish": None,
    }


def _build_stats(rows: list[dict], abbrev: str) -> dict:
    driver_rows = [r for r in rows if r["abbreviation"].upper() == abbrev.upper()]
    if not driver_rows:
        return _empty_stats(abbrev)

    meta = driver_rows[0]
    positions = [r["position"] for r in driver_rows if r["position"] is not None]
    total_points = sum(r["points"] for r in driver_rows)

    wins = sum(1 for p in positions if p == 1)
    podiums = sum(1 for p in positions if p <= 3)
    best_finish = int(min(positions)) if positions else None
    avg_finish = round(sum(positions) / len(positions), 2) if positions else None

    return {
        "abbreviation": meta["abbreviation"],
        "full_name": meta["full_name"],
        "team": meta["team"],
        "number": meta["number"],
        "wins": wins,
        "podiums": podiums,
        "points": total_points,
        "races": len(driver_rows),
        "best_finish": best_finish,
        "avg_finish": avg_finish,
    }


def _championship_position(rows: list[dict], abbrev: str) -> int:
    totals: dict[str, float] = {}
    for r in rows:
        key = r["abbreviation"].upper()
        totals[key] = totals.get(key, 0) + r["points"]

    ranked = sorted(totals.items(), key=lambda x: x[1], reverse=True)
    for rank, (key, _) in enumerate(ranked, start=1):
        if key == abbrev.upper():
            return rank
    return len(ranked) + 1 if abbrev.upper() in DRIVER_ROSTER_2026 else -1


def _get_driver_meta(rows: list[dict], abbrev: str) -> dict:
    """Return the most recent metadata row for a driver."""
    matches = [r for r in rows if r["abbreviation"].upper() == abbrev.upper()]
    if not matches:
        return DRIVER_ROSTER_2026.get(abbrev.upper(), {"full_name": abbrev, "team": "Unknown"})
    return matches[-1]


@router.get("/predict")
def predict_h2h(driver1: str, driver2: str):
    # ── Gather data across all configured seasons ──────────────────────────
    all_rows: list[dict] = []
    for year in sorted(RACES_BY_YEAR.keys()):
        all_rows.extend(_load_results(year, strict=False))

    abbrev1 = driver1.upper()
    abbrev2 = driver2.upper()

    # Validate at least one driver is present somewhere
    rows1 = [r for r in all_rows if r["abbreviation"].upper() == abbrev1]
    rows2 = [r for r in all_rows if r["abbreviation"].upper() == abbrev2]

    if not rows1 and abbrev1 not in DRIVER_ROSTER_2026:
        raise HTTPException(status_code=404, detail=f"Driver '{driver1}' not found in historical data")
    if not rows2 and abbrev2 not in DRIVER_ROSTER_2026:
        raise HTTPException(status_code=404, detail=f"Driver '{driver2}' not found in historical data")

    meta1 = _get_driver_meta(all_rows, abbrev1)
    meta2 = _get_driver_meta(all_rows, abbrev2)

    # ── Head-to-head races (races where BOTH drivers participated) ─────────
    # Group rows by (year, race)
    races_map: dict[tuple, dict] = {}
    for r in all_rows:
        key = (r["year"], r["race"])
        if key not in races_map:
            races_map[key] = {}
        races_map[key][r["abbreviation"].upper()] = r

    h2h_d1_wins = 0
    h2h_d2_wins = 0
    h2h_races: list[dict] = []

    for (year, race), drivers in races_map.items():
        if abbrev1 in drivers and abbrev2 in drivers:
            p1 = drivers[abbrev1].get("position")
            p2 = drivers[abbrev2].get("position")
            if p1 is None or p2 is None:
                continue
            winner_abbrev = abbrev1 if p1 < p2 else abbrev2
            h2h_races.append({"year": year, "race": race, "p1": p1, "p2": p2, "winner": winner_abbrev})
            if winner_abbrev == abbrev1:
                h2h_d1_wins += 1
            else:
                h2h_d2_wins += 1

    total_h2h = h2h_d1_wins + h2h_d2_wins

    # ── Per-driver aggregates ──────────────────────────────────────────────
    def _avg_finish(rows: list[dict]) -> float | None:
        positions = [r["position"] for r in rows if r["position"] is not None]
        return round(sum(positions) / len(positions), 2) if positions else None

    def _win_rate(rows: list[dict]) -> float:
        if not rows:
            return 0.0
        wins = sum(1 for r in rows if r.get("position") == 1)
        return round(wins / len(rows), 4)

    def _recent_form(rows: list[dict], n: int = 3) -> float | None:
        """Average finish across the last n races (chronological order)."""
        valid = [r for r in rows if r["position"] is not None]
        recent = valid[-n:] if len(valid) >= n else valid
        if not recent:
            return None
        return round(sum(r["position"] for r in recent) / len(recent), 2)

    avg1 = _avg_finish(rows1)
    avg2 = _avg_finish(rows2)
    form1 = _recent_form(rows1)
    form2 = _recent_form(rows2)
    wr1 = _win_rate(rows1)
    wr2 = _win_rate(rows2)

    # ── Scoring model ──────────────────────────────────────────────────────
    # h2h component
    if total_h2h > 0:
        h2h_score1 = h2h_d1_wins / total_h2h
        h2h_score2 = h2h_d2_wins / total_h2h
    else:
        h2h_score1 = h2h_score2 = 0.5

    # avg_finish component (lower is better → invert)
    if avg1 is not None and avg2 is not None and (avg1 + avg2) > 0:
        avg_score1 = avg2 / (avg1 + avg2)
        avg_score2 = avg1 / (avg1 + avg2)
    else:
        avg_score1 = avg_score2 = 0.5

    # recent_form component (lower is better → invert)
    if form1 is not None and form2 is not None and (form1 + form2) > 0:
        form_score1 = form2 / (form1 + form2)
        form_score2 = form1 / (form1 + form2)
    else:
        form_score1 = form_score2 = 0.5

    # Weighted composite
    w_h2h, w_avg, w_form = (0.4, 0.3, 0.3) if total_h2h > 0 else (0.0, 0.5, 0.5)
    raw1 = h2h_score1 * w_h2h + avg_score1 * w_avg + form_score1 * w_form
    raw2 = h2h_score2 * w_h2h + avg_score2 * w_avg + form_score2 * w_form

    # Normalise to sum to 1
    total_score = raw1 + raw2 if (raw1 + raw2) > 0 else 1
    score1 = round(raw1 / total_score, 4)
    score2 = round(raw2 / total_score, 4)

    predicted_winner = abbrev1 if score1 >= score2 else abbrev2
    winner_meta = meta1 if predicted_winner == abbrev1 else meta2
    confidence = max(score1, score2)

    # ── Reasoning string ──────────────────────────────────────────────────
    winner_name = winner_meta.get("full_name", predicted_winner).split()[-1]  # last name
    if total_h2h > 0:
        d1_wins_label = f"{h2h_d1_wins}-{h2h_d2_wins}"
        h2h_leader = abbrev1 if h2h_d1_wins >= h2h_d2_wins else abbrev2
        leader_name = (meta1 if h2h_leader == abbrev1 else meta2).get("full_name", h2h_leader).split()[-1]
        reasoning = (
            f"{leader_name} leads the head-to-head {d1_wins_label} across shared races"
            + (f" and has a stronger average finish ({avg1} vs {avg2})" if avg1 and avg2 and avg1 != avg2 else "")
            + "."
        )
    else:
        reasoning = (
            f"No shared races found — prediction based on recent form. "
            f"{winner_name} averages P{avg1 or '?'} vs P{avg2 or '?'}."
        )

    return {
        "next_race": NEXT_RACE,
        "predicted_winner": predicted_winner,
        "predicted_winner_full_name": winner_meta.get("full_name", predicted_winner),
        "predicted_winner_team": winner_meta.get("team", "Unknown"),
        "confidence": round(confidence, 4),
        "h2h_record": {
            "driver1_wins": h2h_d1_wins,
            "driver2_wins": h2h_d2_wins,
            "total_races": total_h2h,
        },
        "reasoning": reasoning,
        "driver1_score": score1,
        "driver2_score": score2,
        "driver1_avg_finish": avg1,
        "driver2_avg_finish": avg2,
        "driver1_recent_form": form1,
        "driver2_recent_form": form2,
        "driver1_win_rate": wr1,
        "driver2_win_rate": wr2,
    }


@router.get("/compare")
def compare_drivers(driver1: str, driver2: str, year: int = 2026):
    rows = _load_results(year)

    stats1 = _build_stats(rows, driver1)
    stats2 = _build_stats(rows, driver2)

    stats1["champ_position"] = _championship_position(rows, driver1)
    stats2["champ_position"] = _championship_position(rows, driver2)

    return {
        "year": year,
        "driver1": stats1,
        "driver2": stats2,
    }
