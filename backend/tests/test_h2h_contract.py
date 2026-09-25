from types import SimpleNamespace

import pandas as pd
import pytest

from app.routers import h2h
from app.services.h2h_contract import final_position, result_exclusion_reason
from app.services.h2h_logic import build_h2h_prediction, head_to_head_record


def row(driver, position, **extra):
    return {
        "year": 2026, "race": "Australia", "session_type": "Race",
        "abbreviation": driver, "position": position, "points": 0,
        "full_name": driver, "team": "Test", "number": "0", **extra,
    }


@pytest.mark.parametrize("value", [None, "", "\\N", "R", 0, -1, True, False, 1.5, "2.5", float("nan"), float("inf")])
def test_invalid_final_positions(value):
    assert final_position(value) is None


@pytest.mark.parametrize("value", [1, 1.0, "1", "1.0"])
def test_valid_final_positions(value):
    assert final_position(value) == 1


@pytest.mark.parametrize("extra,reason", [
    ({"dns": True}, "did_not_start"),
    ({"status": "Did not start"}, "did_not_start"),
    ({"classified_position": "W"}, "did_not_start"),
    ({"status": "Did not qualify"}, "did_not_start"),
    ({"dsq": True}, "disqualified"),
    ({"status": "Disqualified"}, "disqualified"),
    ({"classified_position": "D"}, "disqualified"),
    ({"status": "Not classified"}, "unclassified"),
    ({"classified_position": "N"}, "unclassified"),
    ({"position": None}, "missing_position"),
])
def test_excluded_results_never_award_a_win(extra, reason):
    invalid = {**row("NOR", 2), **extra}
    assert result_exclusion_reason(invalid) == reason
    for pair in [("NOR", "PIA"), ("PIA", "NOR")]:
        record = head_to_head_record([invalid, row("PIA", 3)], *pair)
        assert record["total_races"] == 0
        assert record["driver1_wins"] == record["driver2_wins"] == 0
        assert record["excluded_races"] == 1


def test_retired_drivers_use_final_order_and_selection_is_symmetric():
    rows = [row("NOR", 17, status="Engine", classified_position="R"), row("PIA", 18, dnf=True)]
    forward = head_to_head_record(rows, "NOR", "PIA")
    reverse = head_to_head_record(rows, "PIA", "NOR")
    assert forward["driver1_wins"] == reverse["driver2_wins"] == 1
    assert forward["excluded_races"] == reverse["excluded_races"] == 0


def test_equal_positions_do_not_choose_second_driver():
    record = head_to_head_record([row("NOR", 5), row("PIA", 5)], "NOR", "PIA")
    assert record["total_races"] == 0
    assert record["tied_races"] == 1
    assert record["driver1_wins"] == record["driver2_wins"] == 0


def test_only_grands_prix_and_relevant_drivers_enter_the_record():
    rows = [row("NOR", 1), row("PIA", 2)]
    rows += [row("NOR", 2, session_type="Sprint"), row("PIA", 1, session_type="Sprint")]
    rows += [row("HAM", 1, race="Other Race")]
    rows += [row("NOR", 1, race="Missing Rival")]
    record = head_to_head_record(rows, "NOR", "PIA")
    assert record["driver1_wins"] == 1
    assert record["total_races"] == 1
    assert record["excluded_races"] == 1


def test_one_driver_without_eligible_results_does_not_get_a_prediction():
    prediction = build_h2h_prediction([row("NOR", 1), row("PIA", 2, dns=True)], "NOR", "PIA", "Test GP")
    assert prediction["prediction_status"] == "insufficient_data"
    assert prediction["predicted_winner"] is None
    assert prediction["confidence"] is None


def test_balanced_evidence_does_not_choose_first_driver():
    rows = [row("NOR", 1), row("PIA", 2), row("NOR", 2, race="China"), row("PIA", 1, race="China")]
    prediction = build_h2h_prediction(rows, "NOR", "PIA", "Test GP")
    assert prediction["prediction_status"] == "no_clear_favorite"
    assert prediction["predicted_winner"] is None
    assert "tied" in prediction["reasoning"]


def test_ineligible_history_does_not_influence_prediction_scores():
    rows = [row("NOR", 2), row("PIA", 3)]
    baseline = build_h2h_prediction(rows, "NOR", "PIA", "Test GP")
    rows += [row("PIA", 1, race="Sprint", session_type="Sprint"), row("NOR", 22, race="DNS", dns=True)]
    prediction = build_h2h_prediction(rows, "NOR", "PIA", "Test GP")
    assert prediction["driver1_score"] == baseline["driver1_score"]
    assert prediction["driver2_score"] == baseline["driver2_score"]


def test_api_distinguishes_season_overview_from_prediction_history(client, monkeypatch):
    monkeypatch.setattr(h2h, "_load_results", lambda year, strict=True: [
        row("NOR", 1, year=year), row("PIA", 2, year=year),
    ])
    comparison = client.get("/api/h2h/compare?driver1=NOR&driver2=PIA&year=2026").json()
    prediction = client.get("/api/h2h/predict?driver1=NOR&driver2=PIA").json()
    assert comparison["scope"] == "season"
    assert comparison["year"] == 2026
    assert prediction["target"] == "finish_ahead"
    assert prediction["rule_version"] == "finish-ahead-v1"
    assert prediction["history_scope"] == {"type": "multi_season", "years": [2024, 2025, 2026]}
    assert prediction["h2h_record"]["total_races"] == 3


def test_jolpica_retains_disqualification_metadata(monkeypatch):
    monkeypatch.setattr(h2h, "_fetch_json", lambda url: {"MRData": {"RaceTable": {"Races": [{
        "raceName": "Test GP", "round": "1", "date": "2026-03-08", "Results": [{"Driver": {"code": "NOR"},
        "position": "20", "positionText": "D", "status": "Disqualified"},
        {"Driver": {"code": "PIA"}, "position": "1", "status": "Finished"}],
    }]}}})
    assert result_exclusion_reason(h2h._load_jolpica_results(2026)[0]) == "disqualified"


def test_openf1_retains_dns_and_dsq_flags(monkeypatch):
    def fetch(url):
        if "/sessions?" in url:
            return [{"session_key": 1, "location": "Test", "date_start": "2026-03-08T05:00:00Z", "date_end": "2026-03-08T07:00:00Z"}]
        if "/session_result?" in url:
            return [{"driver_number": 1, "position": 20, "dns": True},
                    {"driver_number": 81, "position": 21, "dsq": True},
                    {"driver_number": 63, "position": 1, "dnf": False, "dns": False, "dsq": False}]
        return []
    monkeypatch.setattr(h2h, "_fetch_json", fetch)
    rows = h2h._load_openf1_results(2026)
    assert [result_exclusion_reason(r) for r in rows] == ["did_not_start", "disqualified", None]


def test_fastf1_retains_classification_metadata(monkeypatch):
    session = SimpleNamespace(load=lambda **kwargs: None, results=pd.DataFrame([{
        "Abbreviation": "NOR", "Position": 20, "Status": "Disqualified", "ClassifiedPosition": "D",
    }, {"Abbreviation": "PIA", "Position": 1, "Status": "Finished"}]))
    session.event = SimpleNamespace(get_session_date=lambda *args, **kwargs: pd.Timestamp("2026-03-08T05:00:00Z"))
    monkeypatch.setattr(h2h, "_ensure_fastf1_cache_enabled", lambda: None)
    monkeypatch.setattr(h2h.fastf1, "get_session", lambda *args: session)
    assert result_exclusion_reason(h2h._load_fastf1_results(2026, h2h.get_season_schedule(2026)[:1], False)[0]) == "disqualified"
