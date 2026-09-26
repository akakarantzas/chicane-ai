"""Canonical, race-only results shared by H2H statistics and predictions."""

from collections import defaultdict
import json
import logging
import re

from app.services.h2h_contract import final_position, result_exclusion_reason
from app.services.h2h_schedule import RaceEvent


SOURCE_PRIORITY = {"jolpica": 0, "fastf1": 1, "openf1": 2}
logger = logging.getLogger(__name__)


def clean_text(value) -> str:
    if not isinstance(value, str):
        return ""
    value = value.strip()
    return "" if value.casefold() in {"nan", "none", "nat", "\\n"} else value


def event_key(row: dict) -> tuple:
    """Production rows use calendar rounds; support name-only legacy callers."""
    number = final_position(row.get("round"))
    return (row["year"], "Race", number if number else clean_text(row["race"]).casefold())


def _outcome(row: dict) -> tuple:
    # Compare eligibility semantics, not provider-specific retirement wording.
    return (row.get("position"), result_exclusion_reason(row), row.get("points"))


def _disagrees(first: dict, second: dict) -> bool:
    return (_outcome(first)[:2] != _outcome(second)[:2]
            or (first.get("points_available", True) and second.get("points_available", True)
                and first.get("points") is not None and second.get("points") is not None
                and first.get("points") != second.get("points")))


def reconcile_results(rows: list[dict], events: list[RaceEvent]) -> list[dict]:
    """One result per season/round/race/driver, independent of input order.

    Provider driver IDs are linked through unambiguous supplied driver codes,
    never car numbers. Code-only fallback identities are explicitly namespaced.
    Conflicting identities or conflicting top-source outcomes are quarantined.
    A selected result's classification and points are kept as a single bundle;
    lower-priority rows cannot resurrect an excluded driver.
    """
    calendar = {(event.year, event.round): event for event in events}
    candidates = []
    ids_by_code = defaultdict(set)
    codes_by_id = defaultdict(set)
    for original in rows:
        year = final_position(original.get("year"))
        number = final_position(original.get("round"))
        event = calendar.get((year, number))
        code = clean_text(original.get("abbreviation")).upper()
        session = clean_text(original.get("session_type", "Race")).casefold()
        source = clean_text(original.get("source")).lower()
        if not event or session not in {"race", "r"} or not re.fullmatch(r"[A-Z]{3}", code):
            continue
        if source not in SOURCE_PRIORITY:
            continue
        date = clean_text(original.get("race_date"))
        if date and date != event.starts_at.date().isoformat():
            continue
        driver_id = clean_text(original.get("driver_id")).lower()
        row = {**original, "abbreviation": code, "driver_id": driver_id,
               "year": year, "round": number, "session_type": "Race", "source": source,
               "position": final_position(original.get("position")),
               "race": event.name, "race_date": event.starts_at.date().isoformat(),
               "source_race": clean_text(original.get("race"))}
        candidates.append(row)
        if driver_id:
            ids_by_code[code].add(driver_id)
            codes_by_id[driver_id].add(code)

    groups = defaultdict(list)
    for row in candidates:
        code = row["abbreviation"]
        identities = ids_by_code[code]
        if len(identities) > 1 or any(len(codes_by_id[value]) > 1 for value in identities):
            logger.warning("Quarantining ambiguous H2H driver identity: %s", code)
            continue
        identity = next(iter(identities)) if identities else f"code:{code}"
        row["driver_id"] = identity
        row["identity_basis"] = "provider_id" if identities else "driver_code"
        groups[(*event_key(row), identity)].append(row)

    results = []
    for key, group in sorted(groups.items()):
        # Stable tie-breaking only for equivalent results (e.g. repeated pages).
        group.sort(key=lambda row: (SOURCE_PRIORITY[row["source"]],
                                   json.dumps(row, sort_keys=True, default=str)))
        selected = group[0]
        peers = [row for row in group if row["source"] == selected["source"]]
        if any(_outcome(row) != _outcome(selected) for row in peers):
            logger.warning("Quarantining conflicting H2H results from %s: %s", selected["source"], key)
            continue
        selected = dict(selected)
        selected["event_id"] = f"{selected['year']}:{selected['round']}:race"
        selected["result_id"] = f"{selected['event_id']}:{selected['driver_id']}"
        selected["sources"] = sorted({row["source"] for row in group}, key=SOURCE_PRIORITY.get)
        selected["conflicting_sources"] = sorted({
            row["source"] for row in group if _disagrees(row, selected)
        }, key=SOURCE_PRIORITY.get)
        results.append(selected)
    return results
