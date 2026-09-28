"""Read a completed Grand Prix qualifying classification from official F1 sources."""
import json
import re
from html.parser import HTMLParser
from urllib.request import Request, urlopen

from app.services.h2h_schedule import parse_utc
from app.services.prediction_history import normalized, race_name


class ResultsPage(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.links, self.rows, self.heading = [], [], []
        self.row = self.cell = None
        self.in_heading = False
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            self.links.append(dict(attrs).get("href", ""))
        if tag == "h1":
            self.in_heading = True
        if tag == "tr":
            self.row = []
        if tag == "td" and self.row is not None:
            self.cell = []

    def handle_data(self, data):
        if self.cell is not None:
            self.cell.append(data)
        if self.in_heading:
            self.heading.append(data)

    def handle_endtag(self, tag):
        if tag == "h1":
            self.in_heading = False
        if tag == "td" and self.cell is not None:
            self.row.append(" ".join(self.cell).strip())
            self.cell = None
        if tag == "tr" and self.row is not None:
            if self.row:
                self.rows.append(self.row)
            self.row = None


def fetch_text(url):
    request = Request(url, headers={"User-Agent": "Chicane.ai/1.0", "Cache-Control": "no-cache"})
    with urlopen(request, timeout=15) as response:
        return response.read(4_000_000).decode("utf-8-sig")


def validate_grid(grid, rows):
    expected = {row["DriverCode"] for row in rows}
    if len(expected) != len(rows) or set(grid) != expected:
        raise ValueError("Qualifying must contain every model driver exactly once")
    if any(type(position) is not int for position in grid.values()):
        raise ValueError("Qualifying positions must be integers")
    if sorted(grid.values()) != list(range(1, len(rows) + 1)):
        raise ValueError("Qualifying positions must form a complete classification")


def parse_classification(text, event, rows):
    page = ResultsPage(text)
    heading = normalized(" ".join(page.heading))
    if (str(event.year) not in heading or race_name(event.name) not in heading
            or not heading.endswith("qualifying") or "sprint" in heading):
        raise ValueError("Results page does not identify the requested Grand Prix qualifying")
    expected = {row["DriverCode"]: row for row in rows}
    grid = {}
    for cells in page.rows:
        if len(cells) != 8 or not cells[0].isdigit():
            raise ValueError("Qualifying classification is incomplete or has an unsupported format")
        codes = set(re.findall(r"\b[A-Z]{3}\b", cells[2])) & expected.keys()
        if len(codes) != 1:
            raise ValueError("Unknown qualifying driver; refresh the model roster")
        code = codes.pop()
        if code in grid or normalized(expected[code]["driver"]) not in normalized(cells[2]):
            raise ValueError("Qualifying driver identity mismatch")
        aliases = {"haasf1team": "haas", "redbullracing": "redbull"}
        actual_team = normalized(cells[3])
        expected_team = normalized(expected[code]["TeamName"])
        if aliases.get(actual_team, actual_team) != aliases.get(expected_team, expected_team):
            raise ValueError("Qualifying team changed; refresh the model roster")
        grid[code] = int(cells[0])
    validate_grid(grid, rows)
    return grid


def completed_qualifying(event, rows, now):
    # Q is the Grand Prix session, never SQ (sprint qualifying).
    import fastf1
    session = fastf1.get_session(event.year, event.name, "Q")
    race_start = parse_utc(session.event.get_session_date("Race", utc=True))
    qualifying_start = parse_utc(session.date)
    if (session.name != "Qualifying" or race_name(session.event.EventName) != race_name(event.name)
            or race_start != event.starts_at or qualifying_start is None):
        raise ValueError("Qualifying session and forecast calendar disagree")
    if qualifying_start > now:
        return None
    completion_url = "https://livetiming.formula1.com" + session.api_path + "ArchiveStatus.json"
    if json.loads(fetch_text(completion_url)).get("Status") != "Complete":
        return None

    # Discover the provider's race ID; its numbering is not the calendar round.
    index = ResultsPage(fetch_text(f"https://www.formula1.com/en/results/{event.year}/races"))
    paths = set()
    for link in index.links:
        match = re.fullmatch(rf"/en/results/{event.year}/races/\d+/([^/]+)/race-result", link)
        if match and race_name(match[1]) == race_name(event.name):
            paths.add(link.rsplit("/", 1)[0] + "/qualifying")
    if len(paths) != 1:
        raise ValueError("Cannot identify a unique official race results page")
    source_url = "https://www.formula1.com" + paths.pop()
    grid = parse_classification(fetch_text(source_url), event, rows)
    return {"positions": grid, "source_url": source_url, "completion_url": completion_url,
            "qualifying_started_at": qualifying_start.isoformat(), "session": "Qualifying"}
