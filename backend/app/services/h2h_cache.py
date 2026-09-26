"""Process-local, single-flight season snapshots shared by both H2H endpoints."""

from copy import deepcopy
from dataclasses import dataclass
from datetime import timedelta
import logging
import os
from threading import Lock
import time
from uuid import uuid4

from fastapi import HTTPException

from app.services.h2h_schedule import race_coverage
from app.services.h2h_standings import unavailable_standings


DEFAULT_H2H_CACHE_TTL_SECONDS = 15 * 60
HISTORICAL_TTL_SECONDS = 6 * 60 * 60
RETRY_SECONDS = 60
MAX_STALE_SECONDS = 24 * 60 * 60
MAX_VERSIONS_PER_SEASON = 3
logger = logging.getLogger(__name__)


@dataclass
class CacheEntry:
    data: dict
    loaded_at: float
    signature: tuple
    ttl: int
    retry_at: float
    attempted_signature: tuple
    last_attempt_at: str
    refresh_error: str | None = None
    stale_fallback: bool = False


_season_cache: dict[int, CacheEntry] = {}
_versions: dict[int, list[CacheEntry]] = {}
_locks: dict[int, Lock] = {}
_registry_lock = Lock()


def get_h2h_cache_ttl_seconds() -> int:
    try:
        ttl = int(os.getenv("H2H_CACHE_TTL_SECONDS", ""))
    except ValueError:
        return DEFAULT_H2H_CACHE_TTL_SECONDS

    return ttl if ttl > 0 else DEFAULT_H2H_CACHE_TTL_SECONDS


def clear_h2h_cache() -> None:
    # Administrative/test reset; do not replace locks while requests may hold them.
    with _registry_lock:
        _season_cache.clear()
        _versions.clear()


def _signature(events, now):
    return tuple(sorted((event.round, event.starts_at.isoformat(), event.name, event.time_confirmed)
                        for event in events if event.results_due(now)))


def _row_keys(rows):
    return {(row.get("year"), row.get("round"), row.get("abbreviation")) for row in rows}


def _public(entry, events, now, signature):
    data = deepcopy(entry.data)
    age = max(0, time.monotonic() - entry.loaded_at)
    stale = bool(entry.stale_fallback or age >= entry.ttl or entry.signature != signature)
    data["freshness"] = {
        "snapshot_id": data.pop("snapshot_id"),
        "status": "unavailable" if data["retrieved_at"] is None else "stale" if stale else "fresh",
        "retrieved_at": data.pop("retrieved_at"), "age_seconds": round(age),
        "ttl_seconds": entry.ttl, "last_attempt_at": entry.last_attempt_at,
        "refresh_error": entry.refresh_error,
        "retry_after_seconds": max(0, round(entry.retry_at - time.monotonic())),
    }
    data["coverage"] = race_coverage(events, data["rows"], now)
    latest = max((event for event in events if event.results_due(now)),
                 key=lambda event: event.starts_at, default=None)
    # Never label an older table as current after another GP becomes due.
    if data["standings"].get("status") == "available" and (
        not latest or data["standings"].get("through_event", {}).get("round") != latest.round
    ):
        data["standings"] = {**data["standings"], "status": "stale", "drivers": {}}
    data["freshness"]["partial"] = bool(data["coverage"]["missing_rounds"] or (
        latest and data["standings"].get("status") != "available"))
    return data


def get_season_snapshot(year, events, now, loader, *, snapshot_id=None):
    """Load rows and standings atomically, or return an aged last-good bundle.

    Pins last at most three versions/24 hours. A lost pin returns 409; never
    silently substitute different data. Retrieval is not upstream publication.
    """
    started = time.monotonic()
    with _registry_lock:
        lock = _locks.setdefault(year, Lock())
    signature = _signature(events, now)
    with lock:
        clock = time.monotonic()
        if snapshot_id:
            for version in _versions.get(year, []):
                if (version.data["snapshot_id"] == snapshot_id and set(version.signature).issubset(set(signature))
                        and clock - version.loaded_at < MAX_STALE_SECONDS):
                    return _public(version, events, now, signature)
            raise HTTPException(409, "H2H snapshot expired or changed. Compare the drivers again.")
        previous = _season_cache.get(year)
        if (previous and previous.attempted_signature == signature and clock < previous.retry_at
                and clock - previous.loaded_at < MAX_STALE_SECONDS):
            return _public(previous, events, now, signature)

        ttl = get_h2h_cache_ttl_seconds()
        if year < now.year and "H2H_CACHE_TTL_SECONDS" not in os.environ:
            ttl = HISTORICAL_TTL_SECONDS
        ttl = min(ttl, MAX_STALE_SECONDS)
        error = None
        compatible_previous = previous and set(previous.signature).issubset(set(signature))
        try:
            loaded = loader(year, events, now) if signature else {"rows": [], "standings": unavailable_standings("no_results_due")}
            due_dates = {event.round: event.starts_at.date().isoformat() for event in events if event.results_due(now)}
            rows = [row for row in loaded["rows"] if row.get("year") == year and row.get("round") in due_dates
                    and (not row.get("race_date") or row["race_date"] == due_dates[row["round"]])]
            standings = loaded["standings"]
            # A truncated refresh must not silently erase previously observed
            # results. Retain the entire old bundle rather than mixing versions.
            if compatible_previous and previous.data["rows"] and not _row_keys(previous.data["rows"]).issubset(_row_keys(rows)):
                error = "results_refresh_incomplete"
            elif signature and not rows:
                error = "results_unavailable"
        except Exception:
            logger.exception("H2H snapshot refresh failed for %s", year)
            rows, standings, error = [], unavailable_standings(), "refresh_failed"

        if (error and compatible_previous and previous.data["retrieved_at"] is not None
                and time.monotonic() - previous.loaded_at < MAX_STALE_SECONDS):
            previous.refresh_error = error
            previous.stale_fallback = True
            previous.retry_at = time.monotonic() + RETRY_SECONDS
            previous.attempted_signature = signature
            previous.last_attempt_at = now.isoformat()
            return _public(previous, events, now, signature)
        if error == "results_refresh_incomplete":
            rows, standings = [], unavailable_standings()

        coverage = race_coverage(events, rows, now)
        partial = bool(error or coverage["missing_rounds"] or (signature and standings.get("status") != "available"))
        has_data = bool(rows or standings.get("status") == "available" or not signature)
        retrieved_at = now + timedelta(seconds=max(0, time.monotonic() - started))
        data = {"rows": rows, "standings": standings, "snapshot_id": uuid4().hex,
                "retrieved_at": retrieved_at.isoformat() if has_data else None}
        entry = CacheEntry(deepcopy(data), time.monotonic(), signature, ttl,
                           time.monotonic() + (min(RETRY_SECONDS, ttl) if partial else ttl),
                           signature, now.isoformat(), error)
        _season_cache[year] = entry
        _versions[year] = ([version for version in _versions.get(year, [])
                            if clock - version.loaded_at < MAX_STALE_SECONDS] + [entry])[-MAX_VERSIONS_PER_SEASON:]
        return _public(entry, events, now, signature)
