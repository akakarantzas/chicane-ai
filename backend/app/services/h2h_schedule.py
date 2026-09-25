"""Dynamic race calendar and conservative result-availability boundaries."""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import json
from threading import Lock
import time
from urllib.request import Request, urlopen

import fastf1
from fastapi import HTTPException
import pandas as pd

SEASON = 2026  # The app's driver roster and season overview are for this season.
HISTORY_YEARS = (2024, 2025, SEASON)
SCHEDULE_TTL_SECONDS = 30 * 60
USER_AGENT = f"ChicaneAI/0.1 FastF1/{fastf1.__version__}"
# A start timestamp is not an end timestamp. Allow time for the race and result
# publication, then require published results as well. This is not a live feed.
RESULT_DELAY = timedelta(hours=4)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def parse_utc(value) -> datetime | None:
    try:
        stamp = pd.Timestamp(value)
        if pd.isna(stamp):
            return None
        stamp = stamp.tz_localize("UTC") if stamp.tzinfo is None else stamp.tz_convert("UTC")
        return stamp.to_pydatetime()
    except (ValueError, TypeError, OverflowError):
        return None


@dataclass(frozen=True)
class RaceEvent:
    year: int
    round: int
    name: str
    starts_at: datetime
    time_confirmed: bool = True

    def results_due(self, now: datetime) -> bool:
        if not self.time_confirmed:
            return self.starts_at.date() < now.date()
        return self.starts_at + RESULT_DELAY <= now

    def public(self) -> dict:
        return {
            "year": self.year, "round": self.round, "race": self.name,
            "date": self.starts_at.date().isoformat(),
            "starts_at": self.starts_at.isoformat() if self.time_confirmed else None,
        }


def _validate_events(events: list[RaceEvent]) -> list[RaceEvent]:
    if not events:
        raise ValueError("Empty race schedule")
    if len({event.round for event in events}) != len(events):
        raise ValueError("Duplicate schedule rounds")
    return sorted(events, key=lambda event: (event.starts_at, event.round))


def _fastf1_schedule(year: int) -> list[RaceEvent]:
    schedule = fastf1.get_event_schedule(year, include_testing=False, backend="fastf1")
    events = []
    for _, event in schedule.iterrows():
        if event.get("EventFormat") in {"testing", "cancelled", "canceled"}:
            continue
        round_number = int(event.get("RoundNumber", 0))
        if round_number <= 0:
            continue
        slot = next((n for n in range(1, 6) if event.get(f"Session{n}") == "Race"), None)
        if slot is None:
            raise ValueError("Race session missing from schedule")
        starts_at = parse_utc(event.get(f"Session{slot}DateUtc"))
        time_confirmed = starts_at is not None
        starts_at = starts_at or parse_utc(event.get("EventDate"))
        name = event.get("EventName")
        if starts_at is None or not isinstance(name, str) or not name.strip():
            raise ValueError("Incomplete race schedule entry")
        events.append(RaceEvent(year, round_number, name, starts_at, time_confirmed))
    return _validate_events(events)


def _schedule_json(url: str) -> dict:
    with urlopen(Request(url, headers={"User-Agent": USER_AGENT}), timeout=8) as response:
        return json.loads(response.read().decode("utf-8"))


def _jolpica_schedule(year: int) -> list[RaceEvent]:
    data = _schedule_json(f"https://api.jolpi.ca/ergast/f1/{year}/races.json?limit=100")
    events = []
    races = data.get("MRData", {}).get("RaceTable", {}).get("Races", [])
    # Never silently turn a truncated response into a complete calendar.
    if int(data.get("MRData", {}).get("total", len(races))) > len(races):
        raise ValueError("Truncated race schedule")
    for race in races:
        if str(race.get("status", "")).lower() in {"cancelled", "canceled"}:
            continue
        race_time = race.get("time")
        starts_at = parse_utc(f"{race.get('date')}T{race_time}" if race_time else race.get("date"))
        round_number = int(race.get("round", 0))
        name = race.get("raceName")
        if starts_at is None or round_number <= 0 or not isinstance(name, str) or not name.strip():
            raise ValueError("Incomplete race schedule entry")
        events.append(RaceEvent(year, round_number, name, starts_at, bool(race_time)))
    return _validate_events(events)


_schedule_cache: dict[int, tuple[float, tuple[RaceEvent, ...]]] = {}
_schedule_lock = Lock()


def clear_schedule_cache() -> None:
    with _schedule_lock:
        _schedule_cache.clear()


def get_season_schedule(year: int) -> list[RaceEvent]:
    with _schedule_lock:
        cached = _schedule_cache.get(year)
        if cached and time.monotonic() - cached[0] < SCHEDULE_TTL_SECONDS:
            return list(cached[1])
        for loader in (_fastf1_schedule, _jolpica_schedule):
            try:
                events = loader(year)
            except Exception:
                continue
            _schedule_cache[year] = (time.monotonic(), tuple(events))
            return list(events)
    raise HTTPException(status_code=502, detail=f"Race schedule unavailable for {year}.")


def next_race(events: list[RaceEvent], now: datetime) -> tuple[RaceEvent | None, str]:
    for event in sorted(events, key=lambda event: event.starts_at):
        if not event.time_confirmed and event.starts_at.date() == now.date():
            return None, "schedule_time_unknown"
        if event.starts_at > now:
            return event, "scheduled"
    return None, "no_upcoming_race"


def race_coverage(events: list[RaceEvent], rows: list[dict], now: datetime) -> dict:
    due = {event.round: event for event in events if event.results_due(now)}
    loaded = {row.get("round") for row in rows if row.get("round") in due}
    missing = sorted(set(due) - loaded)
    return {
        "status": "missing_results" if missing else "all_due_rounds_present" if due else "no_results_due",
        "expected_rounds": sorted(due),
        "loaded_rounds": sorted(loaded),
        "missing_rounds": missing,
        "missing_races": [due[number].public() for number in missing],
    }
