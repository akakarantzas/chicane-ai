"""Persistent first-pre-race forecasts and append-only published-result revisions.

No personal identifiers, request headers or IP addresses are collected.
"""

import argparse
from collections import defaultdict
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
import hashlib
import json
import logging
import os
from pathlib import Path
import sqlite3

from app.services.h2h_backtest import normalized_events
from app.services.h2h_contract import H2H_RULE_VERSION, result_exclusion_reason
from app.services.h2h_history import before_target
from app.services.h2h_schedule import parse_utc


logger = logging.getLogger(__name__)
DEFAULT_DB = Path(__file__).resolve().parents[2] / "data" / "h2h-monitor.sqlite"


def enabled():
    return os.getenv("H2H_MONITOR_ENABLED", "true").strip().lower() not in {"0", "false", "no"}


def database_path():
    return Path(os.getenv("H2H_MONITOR_DB_PATH") or DEFAULT_DB).expanduser().resolve()


def encoded(value):
    return json.dumps(value, sort_keys=True, allow_nan=False, separators=(",", ":"))


def digest(value):
    return hashlib.sha256(encoded(value).encode()).hexdigest()


@contextmanager
def database(path=None, *, write=False):
    path = Path(path) if path is not None else database_path()
    if write:
        path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(str(path) if write else path.resolve().as_uri() + "?mode=ro",
                                 uri=not write, timeout=2)
    connection.row_factory = sqlite3.Row
    try:
        if write:
            connection.execute("PRAGMA foreign_keys=ON")
            version = connection.execute("PRAGMA user_version").fetchone()[0]
            if version not in (0, 1):
                raise ValueError("unsupported monitoring database version")
            connection.executescript("""
                CREATE TABLE IF NOT EXISTS forecasts (
                    id TEXT PRIMARY KEY, event_id TEXT NOT NULL, event_json TEXT NOT NULL,
                    driver1 TEXT NOT NULL, driver2 TEXT NOT NULL,
                    model_version TEXT NOT NULL, rule_version TEXT NOT NULL, policy_version TEXT NOT NULL,
                    recorded_at TEXT NOT NULL, input_hash TEXT NOT NULL, decision_hash TEXT NOT NULL,
                    input_json TEXT NOT NULL, prediction_json TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS outcomes (
                    revision INTEGER PRIMARY KEY AUTOINCREMENT,
                    forecast_id TEXT NOT NULL REFERENCES forecasts(id), observed_at TEXT NOT NULL,
                    evidence_hash TEXT NOT NULL, outcome_json TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS outcomes_forecast ON outcomes(forecast_id, revision);
                CREATE TABLE IF NOT EXISTS result_watermarks (
                    forecast_id TEXT PRIMARY KEY REFERENCES forecasts(id), source_as_of TEXT NOT NULL
                );
                CREATE TRIGGER IF NOT EXISTS forecasts_no_update BEFORE UPDATE ON forecasts
                    BEGIN SELECT RAISE(ABORT, 'forecasts are immutable'); END;
                CREATE TRIGGER IF NOT EXISTS forecasts_no_delete BEFORE DELETE ON forecasts
                    BEGIN SELECT RAISE(ABORT, 'forecasts are immutable'); END;
                CREATE TRIGGER IF NOT EXISTS outcomes_no_update BEFORE UPDATE ON outcomes
                    BEGIN SELECT RAISE(ABORT, 'outcomes are append only'); END;
                CREATE TRIGGER IF NOT EXISTS outcomes_no_delete BEFORE DELETE ON outcomes
                    BEGIN SELECT RAISE(ABORT, 'outcomes are append only'); END;
                PRAGMA user_version = 1;
            """)
            connection.execute("BEGIN IMMEDIATE")
        yield connection
        if write:
            connection.commit()
    except Exception:
        if write:
            connection.rollback()
        raise
    finally:
        connection.close()


def record_forecast(prediction, rows, event, driver1, driver2, now, *, path=None):
    if now.tzinfo is None:
        raise ValueError("recording requires an aware server timestamp")
    if event is None or not event.time_confirmed:
        return {"status": "not_recorded", "reason": "unconfirmed_target_time"}
    # Check completion time, not the timestamp from before a slow data fetch.
    if now >= event.starts_at:
        return {"status": "not_recorded", "reason": "race_already_started"}
    pair = sorted((driver1.upper(), driver2.upper()))
    if pair[0] == pair[1]:
        raise ValueError("distinct drivers required")
    event_id = f"{event.year}:Race:{event.round}"
    model, rule = prediction["model_version"], prediction["rule_version"]
    policy = prediction["uncertainty"]["policy_version"]
    record_id = digest([event_id, pair, model, rule, policy])
    relevant = [row for row in before_target(rows, event) if row["abbreviation"].upper() in pair]
    relevant.sort(key=encoded)
    input_hash = digest(relevant)
    # Canonical orientation allows a reversed selection to match the same forecast.
    scores = {driver1.upper(): prediction["driver1_score"], driver2.upper(): prediction["driver2_score"]}
    decision_hash = digest({"input_hash": input_hash, "event": event.public(), "scores": scores,
                            "status": prediction["prediction_status"], "winner": prediction["predicted_winner"],
                            "reasons": prediction["uncertainty"]["abstention_reasons"],
                            "warnings": prediction["uncertainty"]["data_warnings"]})
    with database(path, write=True) as connection:
        cursor = connection.execute("INSERT OR IGNORE INTO forecasts VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", (
            record_id, event_id, encoded(event.public()), driver1.upper(), driver2.upper(), model, rule, policy,
            now.astimezone(timezone.utc).isoformat(), input_hash, decision_hash, encoded(relevant), encoded(prediction)))
        existing = connection.execute("SELECT recorded_at, decision_hash FROM forecasts WHERE id=?", (record_id,)).fetchone()
    return {"status": "recorded" if cursor.rowcount else "already_recorded", "record_id": record_id,
            "recorded_at": existing["recorded_at"], "matches_current": existing["decision_hash"] == decision_hash,
            "policy": "first_pre_race_per_pair_and_version"}


def settle_results(rows, now, *, path=None, source_times=None):
    path = Path(path) if path is not None else database_path()
    if not path.exists():
        return {"new_revisions": 0, "pending_checks": 0}
    if now.tzinfo is None:
        raise ValueError("settlement requires an aware server timestamp")
    events = {event["event_id"]: event for event in normalized_events(rows)} if rows else {}
    new, pending = 0, 0
    with database(path, write=True) as connection:
        for stored in connection.execute("SELECT * FROM forecasts ORDER BY recorded_at, id").fetchall():
            if stored["rule_version"] != H2H_RULE_VERSION:
                pending += 1  # Never reinterpret an archived forecast under different settlement rules.
                continue
            target = json.loads(stored["event_json"])
            starts_at = parse_utc(target["starts_at"])
            event = events.get(stored["event_id"])
            as_of = parse_utc(source_times.get(str(target["year"]))) if source_times is not None else now
            if (not event or not starts_at or now < starts_at + timedelta(hours=4)
                    or as_of is None or as_of > now or as_of < starts_at + timedelta(hours=4)
                    or parse_utc(stored["recorded_at"]) >= starts_at
                    or event["date"] != target["date"]):
                pending += 1
                continue
            watermark = connection.execute("SELECT source_as_of FROM result_watermarks WHERE forecast_id=?", (stored["id"],)).fetchone()
            if watermark and as_of <= parse_utc(watermark["source_as_of"]):
                continue  # Older snapshots/imports cannot roll back a newer observation.
            # Require a published winner, not a partial or grid-only timing table.
            if not any(row["position"] == 1 and str(row.get("status", "")).casefold() == "finished"
                       for row in event["rows"].values()):
                pending += 1
                continue
            first, second = (event["rows"].get(stored[key]) for key in ("driver1", "driver2"))
            if first is None or second is None:
                pending += 1  # Missing entry is not proof of non-participation or a loss.
                continue
            reasons = sorted({reason for row in (first, second) if (reason := result_exclusion_reason(row))})
            if "missing_position" in reasons:
                pending += 1  # Do not replace a published result with an incomplete refresh.
                continue
            if not reasons and first["position"] == second["position"]:
                reasons = ["equal_positions"]
            prediction = json.loads(stored["prediction_json"])
            actual = None if reasons else stored["driver1"] if first["position"] < second["position"] else stored["driver2"]
            winner = prediction["predicted_winner"] if prediction["prediction_status"] == "available" else None
            outcome = {"status": "excluded" if reasons else "eligible", "exclusion_reasons": reasons,
                       "actual_winner": actual, "predicted_winner": winner,
                       "correct": winner == actual if winner and actual else None,
                       "evidence": [first, second]}
            evidence_hash = digest(outcome)
            connection.execute("INSERT INTO result_watermarks VALUES (?,?) ON CONFLICT(forecast_id) DO UPDATE SET source_as_of=excluded.source_as_of",
                               (stored["id"], as_of.astimezone(timezone.utc).isoformat()))
            last = connection.execute("SELECT evidence_hash FROM outcomes WHERE forecast_id=? ORDER BY revision DESC LIMIT 1",
                                      (stored["id"],)).fetchone()
            if last and last["evidence_hash"] == evidence_hash:
                continue
            outcome["source_as_of"] = as_of.astimezone(timezone.utc).isoformat()
            connection.execute("INSERT INTO outcomes (forecast_id,observed_at,evidence_hash,outcome_json) VALUES (?,?,?,?)",
                               (stored["id"], now.astimezone(timezone.utc).isoformat(), evidence_hash, encoded(outcome)))
            new += 1
    return {"new_revisions": new, "pending_checks": pending}


def capture_prediction(prediction, rows, event, driver1, driver2, now):
    if not enabled():
        return {"status": "disabled"}
    try:
        result = record_forecast(prediction, rows, event, driver1, driver2, now)
    except (sqlite3.Error, OSError, ValueError, KeyError, TypeError):
        logger.warning("H2H forecast recording unavailable")
        return {"status": "unavailable", "reason": "recording_failed"}
    try:
        source_times = {year: item["freshness"].get("retrieved_at") for year, item in prediction.get("snapshots", {}).items()
                        if item.get("freshness", {}).get("status") == "fresh"}
        result["settlement"] = settle_results(rows, now, source_times=source_times)
    except (sqlite3.Error, OSError, ValueError, KeyError, TypeError):
        logger.warning("H2H outcome refresh unavailable")
        result["settlement"] = {"status": "unavailable"}
    return result


def aggregate(records):
    eligible = [record for record in records if record["outcome"] and record["outcome"]["status"] == "eligible"]
    decided = [record for record in eligible if record["outcome"]["correct"] is not None]
    abstained = sum(record["prediction"]["predicted_winner"] is None for record in records)
    return {"logged_pairs": len(records), "eligible_pairs": len(eligible), "decided_pairs": len(decided),
            "pending_pairs": sum(record["outcome"] is None for record in records),
            "excluded_pairs": sum(bool(record["outcome"] and record["outcome"]["status"] == "excluded") for record in records),
            "abstained_pairs": abstained, "abstention_rate": abstained / len(records) if records else None,
            "decision_coverage": len(decided) / len(eligible) if eligible else None,
            "accuracy": sum(record["outcome"]["correct"] for record in decided) / len(decided) if decided else None}


def summary(*, path=None):
    path = Path(path) if path is not None else database_path()
    if not path.exists():
        return {"status": "no_records", "groups": []}
    groups = defaultdict(list)
    with database(path) as connection:
        stored = connection.execute("""SELECT f.*, o.outcome_json, o.observed_at,
            (SELECT count(*) FROM outcomes WHERE forecast_id=f.id) AS revision_count
            FROM forecasts f LEFT JOIN outcomes o ON o.revision=(
                SELECT max(revision) FROM outcomes WHERE forecast_id=f.id)
            ORDER BY f.recorded_at, f.id""").fetchall()
    for record in stored:
        key = (record["model_version"], record["rule_version"], record["policy_version"])
        groups[key].append({"event_id": record["event_id"], "event": json.loads(record["event_json"]),
                            "prediction": json.loads(record["prediction_json"]),
                            "outcome": json.loads(record["outcome_json"]) if record["outcome_json"] else None,
                            "observed_at": record["observed_at"], "revisions": record["revision_count"]})
    output = []
    for (model, rule, policy), records in sorted(groups.items()):
        by_race = defaultdict(list)
        for record in records:
            by_race[record["event_id"]].append(record)
        races = sorted([{"event_id": key, "date": values[0]["event"]["date"], "race": values[0]["event"]["race"],
                         **aggregate(values)} for key, values in by_race.items()], key=lambda race: (race["date"], race["event_id"]))
        accuracies = [race["accuracy"] for race in races if race["accuracy"] is not None]
        trend = {"window_races": 5, "status": "insufficient_races", "previous_accuracy": None,
                 "recent_accuracy": None, "change": None}
        if len(accuracies) >= 10:
            previous, recent = sum(accuracies[-10:-5]) / 5, sum(accuracies[-5:]) / 5
            trend.update(status="available", previous_accuracy=previous, recent_accuracy=recent, change=recent - previous)
        output.append({"model_version": model, "rule_version": rule, "policy_version": policy,
                       "overall": aggregate(records), "races": races,
                       "race_macro_accuracy": sum(accuracies) / len(accuracies) if accuracies else None,
                       "scored_races": len(accuracies), "trend": trend,
                       "result_revisions": sum(max(0, record["revisions"] - 1) for record in records),
                       "latest_outcome_at": max((record["observed_at"] for record in records if record["observed_at"]), default=None)})
    return {"status": "available" if output else "no_records", "groups": output,
            "scope": "first_pre_race_forecasts_requested_from_this_installation",
            "limitations": ["Requested pairs are self-selected, not every possible driver pairing.",
                            "Pairs and races are correlated; trends are descriptive, not significance tests.",
                            "Latest published-result revisions are used; missing refreshes can leave older outcomes.",
                            "Uncalibrated scores are not confidence; no probability calibration claims."]}


def monitoring_summary():
    if not enabled():
        return {"status": "disabled", "groups": []}
    try:
        return summary()
    except (sqlite3.Error, OSError, ValueError, KeyError, TypeError):
        logger.warning("H2H monitoring summary unavailable")
        return {"status": "unavailable", "groups": []}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("summary", "settle"))
    parser.add_argument("--input", type=Path)
    parser.add_argument("--db", type=Path)
    args = parser.parse_args(argv)
    try:
        if args.command == "settle":
            if args.input is None:
                raise ValueError("settle requires --input with published reconciled results")
            data = json.loads(args.input.read_text(encoding="utf-8"))
            rows = data["rows"] if isinstance(data, dict) else data
            completed_at = data.get("provenance", {}).get("completed_at") if isinstance(data, dict) else None
            source_times = {str(row["year"]): completed_at for row in rows} if completed_at else None
            result = settle_results(rows, datetime.now(timezone.utc), path=args.db, source_times=source_times)
        else:
            result = summary(path=args.db)
        print(json.dumps(result, indent=2, sort_keys=True, allow_nan=False))
    except (sqlite3.Error, OSError, ValueError, KeyError, TypeError) as exc:
        parser.error(str(exc))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
