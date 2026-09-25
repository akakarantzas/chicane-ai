"""Versioned product rules for a Grand Prix finish-ahead comparison.

These are ChicaneAI's comparison rules, not a betting settlement policy.
See docs/h2h-accuracy-plan.md for the definition and rollout sequence.
"""

import math


H2H_RULE_VERSION = "finish-ahead-v1"
H2H_TARGET = "finish_ahead"
H2H_TARGET_DESCRIPTION = "Which driver finishes ahead in the next Grand Prix?"


def final_position(value) -> int | None:
    """Accept a positive integral result position, never a sentinel or a boolean."""
    if isinstance(value, bool):
        return None
    try:
        number = float(value)
    except (TypeError, ValueError, OverflowError):
        return None
    if not math.isfinite(number) or number <= 0 or not number.is_integer():
        return None
    return int(number)


def result_exclusion_reason(row: dict) -> str | None:
    """Return why this row cannot be used in a finish-ahead comparison.

    A retirement alone is not grounds for exclusion: providers publish final
    ordering for retired drivers too. Never invent an order from laps or status.
    Legacy rows without a session type come from race-only loaders.
    """
    if str(row.get("session_type", "Race")).strip().casefold() not in {"race", "r"}:
        return "not_grand_prix"
    status = str(row.get("status") or "").strip().casefold()
    classification = str(row.get("classified_position") or "").strip().upper()
    if row.get("dns") is True or status in {
        "dns", "did not start", "withdrawn", "did not qualify", "did not prequalify",
        "dnq", "dnpq",
    } or classification in {"W", "F", "DNS", "DNQ", "DNPQ"}:
        return "did_not_start"
    if row.get("dsq") is True or status in {
        "disqualified", "excluded", "dsq", "dq",
    } or classification in {"D", "DSQ", "DQ", "EX"}:
        return "disqualified"
    if status in {"not classified", "unclassified", "nc"} or classification in {"N", "NC"}:
        return "unclassified"
    if final_position(row.get("position")) is None:
        return "missing_position"
    return None


def eligible_prediction_rows(rows: list[dict]) -> list[dict]:
    return [row for row in rows if result_exclusion_reason(row) is None]
