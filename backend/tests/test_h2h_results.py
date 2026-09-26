from copy import deepcopy
from itertools import permutations

import pytest

from app.routers import h2h
from app.services.h2h_contract import result_exclusion_reason
from app.services.h2h_logic import build_stats, head_to_head_record
from app.services.h2h_results import reconcile_results


def result(**changes):
    return {"year": 2026, "round": 1, "race": "Australian Grand Prix",
            "race_date": "2026-03-08", "session_type": "Race",
            "abbreviation": "NOR", "driver_id": "norris", "number": "1",
            "full_name": "Lando Norris", "team": "McLaren", "position": 1,
            "status": "Finished", "classified_position": "1", "points": 25.0,
            "source": "jolpica", **changes}


def reconcile(rows, year=2026):
    return reconcile_results(rows, h2h.get_season_schedule(year))


def test_aliases_casing_and_duplicate_pages_are_one_result_without_mutating_inputs():
    rows = [result(), result(), result(source="fastf1", race="Australia", abbreviation=" nor "),
            result(source="openf1", race="Melbourne", driver_id="", points=0, points_available=False)]
    before = deepcopy(rows)
    merged = reconcile(rows)
    assert rows == before
    assert len(merged) == 1
    assert merged[0]["result_id"] == "2026:1:race:norris"
    assert merged[0]["race"] == "Australia"
    assert merged[0]["source_race"] == "Australian Grand Prix"
    assert merged[0]["sources"] == ["jolpica", "fastf1", "openf1"]
    assert merged[0]["conflicting_sources"] == []
    stats = build_stats(merged, "NOR")
    assert (stats["races"], stats["wins"], stats["points"]) == (1, 1, 25)


def test_precedence_and_output_are_independent_of_input_order():
    rows = [result(), result(source="fastf1", position=2, points=18),
            result(source="openf1", position=3, points=0, points_available=False)]
    expected = reconcile(rows)
    for order in permutations(rows):
        assert reconcile(list(order)) == expected
    assert expected[0]["source"] == "jolpica"
    assert expected[0]["position"] == 1
    assert expected[0]["conflicting_sources"] == ["fastf1", "openf1"]


def test_missing_driver_falls_back_without_replacing_present_authoritative_result():
    merged = reconcile([result(), result(source="fastf1", position=2),
                        result(abbreviation="PIA", driver_id="piastri", position=2, points=18,
                               number="81", source="fastf1", race="Melbourne")])
    assert len(merged) == 2
    assert [row["source"] for row in merged] == ["jolpica", "fastf1"]
    assert head_to_head_record(merged, "NOR", "PIA")["driver1_wins"] == 1


def test_fastf1_has_priority_over_openf1_when_jolpica_is_missing():
    merged = reconcile([result(source="openf1", position=3), result(source="fastf1", position=2)])
    assert merged[0]["source"] == "fastf1"
    assert merged[0]["position"] == 2
    assert merged[0]["conflicting_sources"] == ["openf1"]


@pytest.mark.parametrize("changes,reason", [
    ({"status": "Disqualified", "classified_position": "D"}, "disqualified"),
    ({"status": "Did not start", "classified_position": "W"}, "did_not_start"),
    ({"position": None, "status": "Unknown", "classified_position": ""}, "missing_position"),
])
def test_lower_sources_cannot_resurrect_excluded_or_missing_classifications(changes, reason):
    merged = reconcile([result(**changes), result(source="fastf1"),
                        result(source="openf1", driver_id="")])
    assert len(merged) == 1
    assert result_exclusion_reason(merged[0]) == reason


def test_conflicting_duplicates_at_top_priority_are_quarantined_not_chosen_arbitrarily(caplog):
    rows = [result(), result(position=2), result(source="fastf1")]
    for order in permutations(rows):
        assert reconcile(list(order)) == []
    assert "Quarantining conflicting" in caplog.text


def test_lower_source_internal_conflicts_do_not_discard_authoritative_result():
    merged = reconcile([result(), result(source="openf1"), result(source="openf1", position=3)])
    assert len(merged) == 1
    assert merged[0]["source"] == "jolpica"
    assert merged[0]["conflicting_sources"] == ["openf1"]


@pytest.mark.parametrize("changes", [
    {"driver_id": "someone_else"},
    {"abbreviation": "PIA"},
])
def test_ambiguous_driver_identity_is_quarantined(changes, caplog):
    assert reconcile([result(), result(source="fastf1", **changes)]) == []
    assert "ambiguous H2H driver identity" in caplog.text


def test_code_only_identity_is_explicit_and_never_derived_from_number():
    merged = reconcile([result(driver_id="", abbreviation="VER", number="1")])
    assert merged[0]["driver_id"] == "code:VER"
    assert merged[0]["identity_basis"] == "driver_code"
    assert reconcile([result(driver_id="", abbreviation="", number="1")]) == []


@pytest.mark.parametrize("changes", [
    {"session_type": "Sprint"}, {"round": None}, {"round": 99}, {"year": 2025},
    {"race_date": "2026-03-09"}, {"abbreviation": "nan"}, {"source": "unknown"},
])
def test_invalid_or_non_race_records_are_not_folded_into_a_grand_prix(changes):
    assert reconcile([result(**changes)]) == []


def test_same_name_different_round_or_season_stays_separate():
    rows = [result(), result(round=2, race_date="2026-03-15"),
            result(year=2025, race_date="2025-03-08")]
    events = h2h.get_season_schedule(2026) + h2h.get_season_schedule(2025)
    merged = reconcile_results(rows, events)
    assert len(merged) == len({row["result_id"] for row in merged}) == 3


def test_pairwise_grouping_uses_round_even_when_display_names_differ():
    rows = [result(), result(abbreviation="PIA", driver_id="piastri", position=2, race="Melbourne")]
    assert head_to_head_record(rows, "NOR", "PIA")["total_races"] == 1


def test_jolpica_preserves_provider_id_and_actual_race_number_without_current_roster_fallback(monkeypatch):
    monkeypatch.setattr(h2h, "_jolpica_result_races", lambda year: [{
        "round": "1", "date": "2024-03-08", "raceName": "Australia", "Results": [
            {"Driver": {"code": "VER", "driverId": "max_verstappen", "permanentNumber": "33"},
             "number": "1", "position": "1", "status": "Finished"},
            {"Driver": {"permanentNumber": "1"}, "position": "2"},
        ],
    }])
    rows = h2h._load_jolpica_results(2024)
    assert len(rows) == 1
    assert rows[0]["abbreviation"] == "VER"
    assert rows[0]["driver_id"] == "max_verstappen"
    assert rows[0]["number"] == "1"
    assert rows[0]["team"] == ""  # Do not invent a 2026 team for historical data.


@pytest.mark.parametrize("drivers,expected", [
    ([], []),
    ([{"driver_number": 1, "name_acronym": "VER", "full_name": "Max Verstappen"}], ["VER"]),
    ([{"driver_number": 1, "name_acronym": "VER"}, {"driver_number": 1, "name_acronym": "NOR"}], []),
])
def test_openf1_uses_only_session_scoped_driver_identity(monkeypatch, drivers, expected):
    def fetch(url):
        if "/sessions?" in url:
            return [{"session_key": 1, "date_start": "2024-03-08T05:00:00Z",
                     "date_end": "2024-03-08T07:00:00Z"}]
        if "/session_result?" in url:
            return [{"driver_number": 1, "position": 1, "dnf": False, "dns": False, "dsq": False}]
        return drivers
    monkeypatch.setattr(h2h, "_fetch_json", fetch)
    rows = h2h._load_openf1_results(2024)
    assert [row["abbreviation"] for row in rows] == expected


def test_compare_and_predict_share_deduplicated_results(client, monkeypatch):
    def rows(year, source):
        return [result(year=year, race_date=f"{year}-03-08", source=source),
                result(year=year, race_date=f"{year}-03-08", source=source,
                       abbreviation="PIA", driver_id="piastri", number="81", position=2, points=18)]
    monkeypatch.setattr(h2h, "_load_fastf1_results", lambda year, *args: rows(year, "fastf1"))
    monkeypatch.setattr(h2h, "_load_jolpica_results", lambda year: rows(year, "jolpica") * 2)
    monkeypatch.setattr(h2h, "_load_openf1_results", lambda year: [
        {**row, "driver_id": "", "race": "Melbourne"} for row in rows(year, "openf1")])
    comparison = client.get("/api/h2h/compare?driver1=NOR&driver2=PIA").json()
    assert comparison["driver1"]["races"] == 1
    assert comparison["driver1"]["points"] == 25
    prediction = client.get("/api/h2h/predict?driver1=NOR&driver2=PIA").json()
    assert prediction["h2h_record"]["total_races"] == 3
    assert prediction["h2h_record"]["driver1_wins"] == 3
