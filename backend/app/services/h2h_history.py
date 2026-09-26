"""Explicit ordering and pre-target boundaries for reconciled H2H history."""

from collections import defaultdict
import json

from app.services.h2h_contract import eligible_prediction_rows, final_position
from app.services.h2h_results import clean_text
from app.services.h2h_schedule import RaceEvent, parse_utc


RECENT_FORM_WINDOW = 3


def race_date(row):
    value = clean_text(row.get("race_date"))
    stamp = parse_utc(value) if value else None
    return stamp.date() if stamp and stamp.year == final_position(row.get("year")) else None


def ordered_history(rows: list[dict]) -> tuple[list[dict], str]:
    """Sort oldest first without mixing date and round scales within a season.

    Prefer dates. Use calendar rounds for an entire season if dates are missing
    and all rounds are known. Never turn a race name or input order into a date.
    Unorderable legacy rows receive deterministic display order only, explicitly
    marked unavailable for recency calculations and latest-metadata selection.
    """
    seasons = defaultdict(list)
    for row in rows:
        seasons[final_position(row.get("year")) or 0].append(row)
    ordered, bases = [], set()
    for year, season in sorted(seasons.items()):
        dates = [race_date(row) for row in season]
        if year and all(dates):
            basis = "race_date"
            key = lambda row: race_date(row).toordinal()
        elif (year and all(final_position(row.get("round")) for row in season)
              and not any(clean_text(row.get("race_date")) and race_date(row) is None for row in season)):
            basis = "season_round"
            key = lambda row: final_position(row["round"])
        else:
            basis = "unavailable"
            key = lambda row: 0
        bases.add(basis)
        ordered.extend(sorted(season, key=lambda row: (key(row), json.dumps(row, sort_keys=True, default=str))))
    if "unavailable" in bases:
        basis = "unavailable"
    elif len(bases) == 1:
        basis = next(iter(bases))
    else:
        basis = "mixed" if bases else "empty"
    return ordered, basis


def latest_result(rows: list[dict]) -> dict:
    ordered, basis = ordered_history(rows)
    return ordered[-1] if ordered and basis != "unavailable" else {}


def before_target(rows: list[dict], target: RaceEvent) -> list[dict]:
    """Date-only results on the target date are excluded conservatively."""
    def earlier(row):
        year = final_position(row.get("year"))
        if year == target.year and final_position(row.get("round")) == target.round:
            return False
        date = race_date(row)
        if date:
            return date < target.starts_at.date()
        if clean_text(row.get("race_date")) or year is None:
            return False  # Invalid supplied dates are not silently repaired.
        number = final_position(row.get("round"))
        return bool(number and (year, number) < (target.year, target.round))
    return [row for row in rows if earlier(row)]


def recent_form_evidence(rows: list[dict], n: int = RECENT_FORM_WINDOW) -> dict:
    if isinstance(n, bool) or not isinstance(n, int) or n <= 0:
        raise ValueError("Recent-form window must be a positive integer")
    ordered, basis = ordered_history(eligible_prediction_rows(rows))
    recent = ordered[-n:] if basis != "unavailable" else []
    races = [{"year": row["year"], "round": final_position(row.get("round")),
              "race": row["race"], "date": race_date(row).isoformat() if race_date(row) else None,
              "position": final_position(row["position"]), "team": row.get("team")}
             for row in recent]
    return {
        "status": "chronology_unavailable" if basis == "unavailable" else "available" if recent else "no_eligible_results",
        "ordering_basis": basis, "sample_size": len(recent),
        "average_finish": round(sum(row["position"] for row in races) / len(races), 2) if races else None,
        "spans_seasons": len({row["year"] for row in races}) > 1,
        "races": races,
    }
