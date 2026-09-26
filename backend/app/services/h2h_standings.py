"""Published championship totals, kept separate from race-only H2H history."""

from datetime import datetime
import logging
import re
from typing import Callable

from app.services.h2h_contract import final_position, published_points
from app.services.h2h_results import clean_text
from app.services.h2h_schedule import RaceEvent, parse_utc


BASE_URL = "https://api.jolpi.ca/ergast/f1"
logger = logging.getLogger(__name__)


def unavailable_standings(status="unavailable") -> dict:
    return {"status": status, "source": "jolpica", "through_event": None, "drivers": {}}


def load_standings(year: int, events: list[RaceEvent], now: datetime,
                   fetch_json: Callable[[str], dict]) -> dict:
    """Validate one complete published table against the latest due GP.

    Use published ranks, including the provider's tie-breaks, instead of ranking
    an incomplete race-only points sum. Never substitute zeros on source failure.
    Latest means through the latest due GP, not live sprint-weekend standings.
    """
    due = [event for event in events if event.year == year and event.results_due(now)]
    if not due:
        return unavailable_standings("no_results_due")
    expected = max(due, key=lambda event: event.starts_at)
    try:
        data = fetch_json(f"{BASE_URL}/{year}/driverstandings.json?limit=100")
        meta = data["MRData"]
        table = meta["StandingsTable"]
        lists = table["StandingsLists"]
        if len(lists) != 1:
            raise ValueError("Missing or ambiguous standings table")
        standings = lists[0]
        provider_round = final_position(standings.get("round"))
        entries = standings["DriverStandings"]
        if (int(standings["season"]) != year or int(table.get("season", year)) != year
                or not provider_round or not entries
                or int(meta["total"]) != len(entries) or int(meta.get("offset", 0)) != 0):
            raise ValueError("Wrong season or incomplete standings table")

        # Providers can renumber rounds after cancellations. Resolve the reported
        # provider round by date, never assume its number is the calendar's number.
        calendar_data = fetch_json(f"{BASE_URL}/{year}/{provider_round}/races.json?limit=100")
        races = calendar_data["MRData"]["RaceTable"]["Races"]
        if len(races) != 1 or int(races[0]["season"]) != year or int(races[0]["round"]) != provider_round:
            raise ValueError("Standings round could not be verified")
        date = parse_utc(races[0].get("date"))
        matches = [event for event in due if date and event.starts_at.date() == date.date()]
        if len(matches) != 1:
            raise ValueError("Standings are outside the completed calendar")
        through_event = matches[0]
        if through_event != expected:
            return {**unavailable_standings("stale"), "through_event": through_event.public()}

        drivers = {}
        ids, ranks = set(), set()
        for entry in entries:
            driver = entry["Driver"]
            code = clean_text(driver.get("code")).upper()
            driver_id = clean_text(driver.get("driverId")).lower()
            points = published_points(entry.get("points"))
            position_text = clean_text(entry.get("positionText")).upper()
            excluded = position_text in {"D", "E", "-"}
            rank = None if excluded else final_position(entry.get("position"))
            if (not re.fullmatch(r"[A-Z]{3}", code) or not driver_id or points is None
                    or code in drivers or driver_id in ids
                    or (not excluded and (rank is None or rank > len(entries) or rank in ranks))):
                raise ValueError("Invalid or duplicate standings entry")
            drivers[code] = {"driver_id": driver_id, "points": points,
                             "champ_position": rank, "classification": position_text}
            ids.add(driver_id)
            if rank is not None:
                ranks.add(rank)
        return {"status": "available", "source": "jolpica",
                "through_event": through_event.public(), "drivers": drivers}
    except Exception as exc:
        logger.warning("H2H standings unavailable for %s: %s", year, exc)
        return unavailable_standings()
