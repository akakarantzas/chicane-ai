"""Explicit online export of a frozen H2H evaluation dataset."""

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path

from app.services.h2h_backtest import normalized_events
from app.services.h2h_results import reconcile_results
from app.services.h2h_schedule import HISTORY_YEARS, race_coverage


def export_dataset(years, *, schedule_loader=None, result_loader=None, fallback_loader=None, now=None):
    from app.routers import h2h

    years = sorted(set(years))
    if not years or any(year not in HISTORY_YEARS for year in years):
        raise ValueError(f"years must be drawn from {HISTORY_YEARS}")
    schedule_loader = schedule_loader or h2h.get_season_schedule
    result_loader = result_loader or h2h._load_jolpica_results
    fallback_loader = fallback_loader or (lambda year, events: h2h._load_fastf1_results(year, events, False))
    now = now or datetime.now(timezone.utc)
    rows, seasons = [], {}
    for year in years:
        events = [event for event in schedule_loader(year) if event.results_due(now)]
        raw = result_loader(year)
        reconciled = reconcile_results(raw, events)
        coverage = race_coverage(events, reconciled, now)
        fallback_rounds = coverage["missing_rounds"]
        if fallback_rounds:
            missing = [event for event in events if event.round in fallback_rounds]
            raw.extend(fallback_loader(year, missing))
            reconciled = reconcile_results(raw, events)
            coverage = race_coverage(events, reconciled, now)
        if coverage["status"] != "all_due_rounds_present":
            raise ValueError(f"incomplete or empty {year} dataset: {coverage['missing_rounds']}")
        if len(raw) != len(reconciled):
            raise ValueError(f"{year} reconciliation dropped entries; inspect sources before evaluating")
        normalized_events(reconciled)
        rows.extend(reconciled)
        seasons[str(year)] = {"calendar": [event.public() for event in events],
                              "coverage": coverage, "rows": len(reconciled),
                              "fastf1_fallback_rounds": fallback_rounds}
    normalized_events(rows)  # Also reject identities that conflict across seasons.
    return {"schema_version": 1, "rows": rows, "provenance": {
        "started_at": now.isoformat(), "completed_at": datetime.now(timezone.utc).isoformat(),
        "result_source": "jolpica with FastF1 for missing calendar races", "source_url": h2h.JOLPICA_BASE_URL,
        "calendar_policy": "application FastF1 calendar with Jolpica fallback",
        "seasons": seasons,
        "limitations": ["No independent classification audit; source choice is recorded per row.",
                        "Calendar round coverage does not prove all driver entries are present.",
                        "Current corrected classifications, not historical as-published snapshots."]}}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--years", nargs="+", type=int, default=list(HISTORY_YEARS))
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args(argv)
    try:
        if args.output.exists():
            raise ValueError("output already exists; choose a new snapshot path")
        dataset = export_dataset(args.years)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with args.output.open("x", encoding="utf-8") as stream:
            json.dump(dataset, stream, indent=2, sort_keys=True, allow_nan=False)
            stream.write("\n")
        print(json.dumps({"output": str(args.output), "rows": len(dataset["rows"])}))
    except (OSError, ValueError) as exc:
        parser.error(str(exc))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
