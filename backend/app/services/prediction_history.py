"""Archive published pre-race forecasts and attach published race classifications."""

import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import hashlib
import json
import logging
import math
import os
from pathlib import Path
import sqlite3
from threading import Lock
import time
import unicodedata

from dotenv import load_dotenv

from app.services.h2h_contract import final_position
from app.services.h2h_schedule import get_season_schedule, utc_now


logger = logging.getLogger(__name__)
MODELS_DIR = Path(__file__).resolve().parents[1] / "models"
DEFAULT_DB = Path(__file__).resolve().parents[2] / "data" / "prediction-history.sqlite"
_refresh_lock = Lock()
_last_refresh = {}


def enabled():
    return os.getenv("PREDICTION_HISTORY_ENABLED", "true").strip().lower() not in {"false", "0", "no"}


def database_path():
    return Path(os.getenv("PREDICTION_HISTORY_DB_PATH") or DEFAULT_DB).expanduser().resolve()


def refresh_seconds():
    try:
        return max(10, int(os.getenv("PREDICTION_HISTORY_REFRESH_SECONDS", "60")))
    except ValueError:
        return 60


def encoded(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False)


def timestamp(value):
    stamp = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if stamp.tzinfo is None:
        raise ValueError("forecast timestamps require a timezone")
    return stamp.astimezone(timezone.utc)


def normalized(value):
    text = unicodedata.normalize("NFKD", value).casefold()
    return "".join(char for char in text if char.isalnum())


def race_name(value):
    name = normalized(value)
    if name.endswith("grandprix"):
        name = name[:-9]
    elif name.endswith("gp"):
        name = name[:-2]
    return {"barcelona": "barcelonacatalunya", "greatbritain": "british",
            "australian": "australia", "chinese": "china", "japanese": "japan",
            "canadian": "canada", "austrian": "austria", "italian": "italy",
            "spanish": "spain", "hungarian": "hungary", "belgian": "belgium"}.get(name, name)


def validate_forecast(predictions, metadata):
    if not isinstance(metadata, dict) or any(
        not isinstance(metadata.get(key), str) or not metadata[key].strip()
        for key in ("race", "circuit", "model_version")
    ):
        raise ValueError("forecast metadata requires race, circuit and model_version")
    if not isinstance(predictions, list) or not predictions:
        raise ValueError("forecast predictions must be a nonempty array")
    seen = set()
    for row in predictions:
        if not isinstance(row, dict) or any(
            not isinstance(row.get(key), str) or not row[key].strip() for key in ("driver", "team")
        ):
            raise ValueError("each forecast entry requires a driver and team")
        probability = row.get("probability")
        if (isinstance(probability, bool) or not isinstance(probability, (int, float))
                or not math.isfinite(probability) or not 0 <= probability <= 1):
            raise ValueError("invalid forecast probability")
        name = normalized(row["driver"])
        if name in seen:
            raise ValueError("duplicate forecast driver")
        seen.add(name)
    if not isinstance(metadata.get("prediction_input", {}), dict):
        raise ValueError("invalid prediction input metadata")
    if metadata.get("generated_at"):
        timestamp(metadata["generated_at"])


@contextmanager
def database(path=None, *, write=False):
    path = Path(path) if path is not None else database_path()
    if write:
        path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(str(path) if write else path.resolve().as_uri() + "?mode=ro",
                                 uri=not write, timeout=5)
    connection.row_factory = sqlite3.Row
    try:
        if write:
            connection.executescript("""
                CREATE TABLE IF NOT EXISTS history_forecasts (
                    id TEXT PRIMARY KEY, event_id TEXT NOT NULL,
                    event_json TEXT NOT NULL, recorded_at TEXT NOT NULL, payload_json TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS history_forecast_event ON history_forecasts(event_id);
                CREATE TABLE IF NOT EXISTS history_results (
                    event_id TEXT PRIMARY KEY, observed_at TEXT NOT NULL, result_json TEXT NOT NULL
                );
                CREATE TRIGGER IF NOT EXISTS history_forecasts_no_update
                    BEFORE UPDATE ON history_forecasts
                    BEGIN SELECT RAISE(ABORT, 'archived forecasts are immutable'); END;
                CREATE TRIGGER IF NOT EXISTS history_forecasts_no_delete
                    BEFORE DELETE ON history_forecasts
                    BEGIN SELECT RAISE(ABORT, 'archived forecasts are immutable'); END;
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


def resolve_event(metadata, now):
    generated = timestamp(metadata["generated_at"]) if metadata.get("generated_at") else now
    year = int(metadata.get("year", generated.year))
    matches = [event for event in get_season_schedule(year)
               if race_name(event.name) == race_name(metadata["race"])]
    if len(matches) != 1:
        raise ValueError("forecast does not identify a unique calendar race")
    event = matches[0]
    if metadata.get("race_date") and metadata["race_date"] != event.starts_at.date().isoformat():
        raise ValueError("forecast date disagrees with the race calendar")
    return event


def record_forecast(predictions, metadata, *, now=None, event=None, path=None):
    validate_forecast(predictions, metadata)
    supplied_now = now
    now = utc_now() if now is None else now
    if now.tzinfo is None:
        raise ValueError("recording requires an aware server timestamp")
    event = resolve_event(metadata, now) if event is None else event
    # Re-check after calendar retrieval; a slow fetch must not backfill a forecast.
    checked_at = utc_now() if supplied_now is None else now
    checked_at = checked_at.astimezone(timezone.utc)
    if not event.time_confirmed:
        return {"status": "not_recorded", "reason": "unconfirmed_race_start"}
    if checked_at >= event.starts_at:
        return {"status": "not_recorded", "reason": "race_already_started"}
    generated = timestamp(metadata["generated_at"]) if metadata.get("generated_at") else None
    if generated and (generated > checked_at or generated >= event.starts_at):
        raise ValueError("forecast generation time is in the future or after race start")
    stage = "Post-Qualifying" if metadata.get("prediction_input", {}).get("grid_source") == "qualifying_grid" else "Pre-Qualifying"
    payload = {"race": metadata["race"], "circuit": metadata["circuit"],
               "predictions": sorted(predictions, key=lambda row: row["probability"], reverse=True), "model_version": metadata["model_version"],
               "generated_at": metadata.get("generated_at"), "status": stage, "metadata": metadata}
    event_id = f"{event.year}:Race:{event.round}"
    record_id = hashlib.sha256(encoded([event.public(), payload]).encode()).hexdigest()
    with database(path, write=True) as connection:
        cursor = connection.execute("INSERT OR IGNORE INTO history_forecasts VALUES (?,?,?,?,?)",
                                    (record_id, event_id, encoded(event.public()), checked_at.isoformat(), encoded(payload)))
    return {"status": "recorded" if cursor.rowcount else "already_recorded", "id": record_id}


def capture_forecast(predictions, metadata):
    if not enabled():
        return {"status": "disabled"}
    if (MODELS_DIR / ".prediction-publish.lock").exists():
        return {"status": "not_recorded", "reason": "artifacts_updating"}
    try:
        return record_forecast(predictions, metadata)
    except Exception:
        logger.warning("Could not archive the published race forecast")
        return {"status": "unavailable"}


def forecast_records(path=None):
    path = Path(path) if path is not None else database_path()
    if not path.exists():
        return []
    with database(path) as connection:
        return [dict(row) for row in connection.execute("SELECT * FROM history_forecasts ORDER BY recorded_at,id")]


def matches_event(race, event):
    if race_name(race.get("raceName", "")) != race_name(event["race"]):
        return False
    if race.get("date") == event["date"]:
        return True
    # Jolpica can label Las Vegas by its Saturday local date, while FastF1's
    # confirmed race start is Sunday UTC. Require the same round and identity
    # for this known boundary; other date disagreements stay unresolved.
    if race_name(event["race"]) != "lasvegas" or final_position(race.get("round")) != event["round"]:
        return False
    try:
        source_date = datetime.fromisoformat(race["date"]).date()
        start = timestamp(event["starts_at"])
        return start.hour < 8 and (start.date() - source_date).days == 1
    except (KeyError, ValueError, TypeError):
        return False


def published_result(race, event, minimum_entries):
    if not matches_event(race, event):
        return None
    rows = race.get("Results", [])
    if not isinstance(rows, list) or len(rows) < max(2, minimum_entries):
        return None
    winners = [row for row in rows if final_position(row.get("position")) == 1]
    if len(winners) != 1 or winners[0].get("status", "").casefold() != "finished":
        return None
    if final_position(winners[0].get("Time", {}).get("millis")) is None:
        return None  # Grid/live entries without a completed winning race time are insufficient.
    winner = winners[0].get("Driver", {})
    if not winner.get("familyName") or not winner.get("givenName"):
        return None
    actual = []
    identities = set()
    positions = set()
    for row in rows:
        driver = row.get("Driver", {})
        identity = driver.get("driverId") or driver.get("code")
        position = final_position(row.get("position"))
        if not identity or identity in identities or not position or position in positions:
            return None
        if not driver.get("familyName") or not isinstance(row.get("status"), str) or not row["status"]:
            return None
        identities.add(identity)
        positions.add(position)
        actual.append({"driver": driver["familyName"],
                       "fullName": f"{driver.get('givenName', '')} {driver['familyName']}".strip(),
                       "team": row.get("Constructor", {}).get("name", ""),
                       "position": position, "classification": row.get("positionText", str(position)),
                       "status": row["status"], "points": row.get("points")})
    number = final_position(race.get("round"))
    if number is None:
        return None
    return {"actualWinner": winner["familyName"],
            "winnerFullName": f"{winner['givenName']} {winner['familyName']}",
            "actualResults": sorted(actual, key=lambda row: row["position"]),
            "resultSource": f"https://api.jolpi.ca/ergast/f1/{event['year']}/{number}/results.json"}


def load_result_races(year):
    # Reuse the existing paginated adapter; a race can span response pages.
    from app.routers.h2h import _jolpica_result_races
    return _jolpica_result_races(year)


def settle_results(*, path=None, now=None, loader=None):
    loader = load_result_races if loader is None else loader
    supplied_now = now
    now = utc_now() if now is None else now
    records = forecast_records(path)
    events = {}
    for record in records:
        event = json.loads(record["event_json"])
        if timestamp(event["starts_at"]) <= now:
            payload = json.loads(record["payload_json"])
            key = record["event_id"]
            count = max(len(payload["predictions"]), events.get(key, ({}, 0))[1])
            events[key] = (event, count)
    changed = 0
    for year in sorted({event["year"] for event, _ in events.values()}):
        races = loader(year)
        for event_id, (event, minimum_entries) in events.items():
            if event["year"] != year:
                continue
            candidates = [race for race in races if matches_event(race, event)]
            if len(candidates) != 1:
                continue
            result = published_result(candidates[0], event, minimum_entries)
            if result is None:
                continue
            observed = utc_now() if supplied_now is None else now
            with database(path, write=True) as connection:
                old = connection.execute("SELECT * FROM history_results WHERE event_id=?", (event_id,)).fetchone()
                if old and timestamp(old["observed_at"]) > observed:
                    continue
                if old and len(json.loads(old["result_json"])["actualResults"]) > len(result["actualResults"]):
                    continue  # A truncated refresh cannot erase a published classification.
                connection.execute("INSERT INTO history_results VALUES (?,?,?) ON CONFLICT(event_id) DO UPDATE SET observed_at=excluded.observed_at,result_json=excluded.result_json",
                                   (event_id, observed.isoformat(), encoded(result)))
                changed += int(not old or old["result_json"] != encoded(result))
    return changed


def scan_forecasts(models_dir=None):
    directory = MODELS_DIR if models_dir is None else Path(models_dir)
    if (directory / ".prediction-publish.lock").exists():
        return 0
    failures = 0
    for manifest in sorted((directory / "forecast-archive").glob("*.json")):
        try:
            import_forecast(json.loads(manifest.read_text(encoding="utf-8")))
        except Exception:
            failures += 1
            logger.warning("Could not import archived forecast")
    for metadata_path in sorted(directory.glob("*_metadata.json")):
        prediction_path = metadata_path.with_name(metadata_path.name.replace("_metadata.json", "_predictions.json"))
        if not prediction_path.exists():
            continue
        try:
            before = (metadata_path.stat().st_mtime_ns, prediction_path.stat().st_mtime_ns)
            metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
            predictions = json.loads(prediction_path.read_text(encoding="utf-8"))
            after = (metadata_path.stat().st_mtime_ns, prediction_path.stat().st_mtime_ns)
            if before != after:
                continue  # Retry files that changed while being read.
            record_forecast(predictions, metadata)
        except Exception:
            failures += 1
            logger.warning("Could not archive forecast artifacts")
    return failures


def export_forecast(record_id, directory):
    with database() as connection:
        row = dict(connection.execute("SELECT * FROM history_forecasts WHERE id=?", (record_id,)).fetchone())
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    target = directory / f"{record_id}.json"
    if target.exists():
        existing = json.loads(target.read_text(encoding="utf-8"))
        if existing["id"] != row["id"] or existing["payload_json"] != row["payload_json"] or existing["event_json"] != row["event_json"]:
            raise ValueError("conflicting archived forecast manifest")
        return
    temporary = directory / f"{record_id}.{os.getpid()}.tmp"
    temporary.write_text(encoded(row) + "\n", encoding="utf-8")
    temporary.replace(target)


def import_forecast(record, *, path=None, now=None):
    """Import an operator-published manifest of a forecast captured before start."""
    now = utc_now() if now is None else now
    event = json.loads(record["event_json"])
    payload = json.loads(record["payload_json"])
    validate_forecast(payload["predictions"], payload["metadata"])
    validate_forecast(payload["predictions"], payload)
    recorded = timestamp(record["recorded_at"])
    if recorded >= timestamp(event["starts_at"]) or recorded > now:
        raise ValueError("manifest was not recorded before race start")
    generated = timestamp(payload["generated_at"]) if payload.get("generated_at") else recorded
    if generated > recorded:
        raise ValueError("manifest generation time follows recording")
    expected_id = hashlib.sha256(encoded([event, payload]).encode()).hexdigest()
    if record["id"] != expected_id or record["event_id"] != f"{event['year']}:Race:{event['round']}":
        raise ValueError("manifest identity does not match its contents")
    with database(path, write=True) as connection:
        connection.execute("INSERT OR IGNORE INTO history_forecasts VALUES (?,?,?,?,?)",
                           tuple(record[key] for key in ("id", "event_id", "event_json", "recorded_at", "payload_json")))


def refresh_history(*, force=False):
    if not enabled():
        return {"status": "disabled", "checked_at": None}
    key = str(database_path())
    with _refresh_lock:
        previous = _last_refresh.get(key)
        if not force and previous and time.monotonic() - previous[0] < refresh_seconds():
            return previous[1]
        error = False
        try:
            error = bool(scan_forecasts())
            settle_results()
        except Exception:
            error = True
            logger.warning("Prediction history refresh failed; keeping saved forecasts and results")
        state = {"status": "stale" if error else "ready", "checked_at": utc_now().isoformat()}
        _last_refresh[key] = (time.monotonic(), state)
        return state


def read_history(*, path=None, now=None):
    records = forecast_records(path)
    if not records:
        return {"races": [], "pending_count": 0}
    now = utc_now() if now is None else now
    with database(path) as connection:
        outcomes = {row["event_id"]: json.loads(row["result_json"])
                    for row in connection.execute("SELECT * FROM history_results")}
    grouped = {}
    pending = set()
    for record in records:
        event = json.loads(record["event_json"])
        if timestamp(event["starts_at"]) > now:
            continue
        result = outcomes.get(record["event_id"])
        if not result:
            if timestamp(event["starts_at"]) <= now:
                pending.add(record["event_id"])
            continue
        payload = json.loads(record["payload_json"])
        winner_names = {normalized(result["actualWinner"]), normalized(result["winnerFullName"])}
        actual_winner = next((row["driver"] for row in payload["predictions"]
                              if normalized(row["driver"]) in winner_names), result["actualWinner"])
        forecast = {"id": record["id"], "recordedAt": record["recorded_at"],
                    "generatedAt": payload["generated_at"], "status": payload["status"],
                    "modelVersion": payload["model_version"], "predictions": payload["predictions"],
                    "actualWinner": actual_winner}
        day = datetime.fromisoformat(event["date"])
        card = grouped.setdefault(record["event_id"], {
            "id": record["event_id"], "race": event["race"], "circuit": payload["circuit"],
            "raceDate": event["date"], "date": f"{day:%B} {day.day}, {day.year}",
            **result, "forecasts": [],
        })
        card["forecasts"].append(forecast)
    for event_id, card in grouped.items():
        card["forecasts"].sort(key=lambda item: (timestamp(item["generatedAt"] or item["recordedAt"]), item["recordedAt"], item["id"]), reverse=True)
        card.update(card["forecasts"][0])
        card["id"] = event_id
    return {"races": sorted(grouped.values(), key=lambda card: card["raceDate"], reverse=True),
            "pending_count": len(pending)}


def history_response():
    if not enabled():
        return {"status": "disabled", "races": [], "pending_count": 0, "checked_at": None}
    state = refresh_history()
    try:
        return {**read_history(), **state}
    except Exception:
        logger.warning("Could not read prediction history")
        return {"status": "unavailable", "races": [], "pending_count": 0, "checked_at": state["checked_at"]}


def run_worker(stop):
    while not stop.is_set():
        refresh_history()
        stop.wait(refresh_seconds())


def main(argv=None):
    load_dotenv()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("capture", "refresh"))
    parser.add_argument("--predictions", type=Path)
    parser.add_argument("--metadata", type=Path)
    parser.add_argument("--export-dir", type=Path)
    args = parser.parse_args(argv)
    if not enabled():
        parser.error("prediction history is disabled")
    if args.command == "capture":
        if args.predictions is None or args.metadata is None:
            parser.error("capture requires --predictions and --metadata")
        result = record_forecast(json.loads(args.predictions.read_text(encoding="utf-8")),
                                 json.loads(args.metadata.read_text(encoding="utf-8")))
        if result.get("id") and args.export_dir is not None:
            export_forecast(result["id"], args.export_dir)
    else:
        result = refresh_history(force=True)
    print(encoded(result))


if __name__ == "__main__":
    main()
