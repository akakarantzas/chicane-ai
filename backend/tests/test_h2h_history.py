from copy import deepcopy
from datetime import datetime, timezone
from random import Random

import pytest

from app.routers import h2h
from app.services.h2h_history import before_target, ordered_history, recent_form_evidence
from app.services.h2h_logic import build_h2h_prediction, build_stats, get_driver_meta, head_to_head_record, recent_form
from app.services.h2h_schedule import RaceEvent


def result(number, position, **changes):
    return {"year": 2026, "round": number, "race": f"GP {number}",
            "race_date": f"2026-03-{number:02d}", "session_type": "Race",
            "abbreviation": "NOR", "driver_id": "norris", "full_name": "Lando Norris",
            "team": "McLaren", "number": "1", "position": position, "status": "Finished",
            "points": 0, **changes}


def target():
    return RaceEvent(2026, 5, "Target GP", datetime(2026, 3, 5, 12, tzinfo=timezone.utc))


def test_latest_three_are_chronological_not_the_last_three_loaded():
    rows = [result(5, 5), result(2, 20), result(4, 3), result(1, 22), result(3, 1)]
    original = deepcopy(rows)
    form = recent_form_evidence(rows)
    assert [row["round"] for row in form["races"]] == [3, 4, 5]
    assert form["average_finish"] == 3
    assert form["ordering_basis"] == "race_date"
    assert rows == original
    assert [row["round"] for row in ordered_history(rows)[0]] == [1, 2, 3, 4, 5]


def test_date_order_wins_over_round_number_for_rescheduled_events():
    rows = [result(1, 2, race_date="2026-03-20", team="Newest Team"),
            result(2, 10, race_date="2026-03-10", team="Older Team")]
    assert recent_form(rows, n=1) == 2
    assert build_stats(list(reversed(rows)), "NOR")["team"] == "Newest Team"
    assert get_driver_meta(rows, "NOR")["team"] == "Newest Team"


def test_numeric_round_fallback_does_not_sort_10_before_2():
    rows = [result(10, 10, race_date=None, round="10"), result(2, 2, race_date=None, round="2")]
    form = recent_form_evidence(rows, 1)
    assert form["ordering_basis"] == "season_round"
    assert form["average_finish"] == 10
    assert form["races"][0]["date"] is None


def test_partial_dates_use_one_consistent_round_basis_for_the_whole_season():
    rows = [result(1, 20), result(3, 3, race_date=None), result(2, 2)]
    form = recent_form_evidence(rows, 2)
    assert form["ordering_basis"] == "season_round"
    assert [row["round"] for row in form["races"]] == [2, 3]


def test_form_carries_previous_season_forward_explicitly():
    rows = [result(1, 3), result(24, 1, year=2025, race_date="2025-12-07"),
            result(23, 2, year=2025, race_date="2025-11-30")]
    form = recent_form_evidence(rows)
    assert [row["year"] for row in form["races"]] == [2025, 2025, 2026]
    assert form["spans_seasons"] is True
    assert form["average_finish"] == 2


def test_seasons_can_use_different_known_ordering_bases():
    rows = [result(1, 3), result(24, 1, year=2025, race_date=None)]
    form = recent_form_evidence(rows)
    assert form["ordering_basis"] == "mixed"
    assert [row["year"] for row in form["races"]] == [2025, 2026]


@pytest.mark.parametrize("changes", [
    {"race_date": None, "round": None}, {"race_date": "bad"},
    {"race_date": "2025-03-01"}, {"year": None},
])
def test_unknown_or_contradictory_chronology_does_not_use_input_order(changes):
    form = recent_form_evidence([result(1, 1, **changes), result(2, 2)])
    assert form["status"] == "chronology_unavailable"
    assert form["average_finish"] is None
    assert form["sample_size"] == 0
    assert form["races"] == []


@pytest.mark.parametrize("n", [0, -1, True, 1.5, "3"])
def test_invalid_form_windows_are_rejected(n):
    with pytest.raises(ValueError, match="positive integer"):
        recent_form_evidence([result(1, 1)], n)


def test_eligibility_is_applied_before_window_selection():
    rows = [result(1, 2), result(2, 4), result(3, 18, status="Engine"),
            result(4, 1, dns=True), result(5, 1, dsq=True),
            result(6, 1, session_type="Sprint"), result(7, 1, classified_position="N"),
            result(8, None), result(9, 0)]
    form = recent_form_evidence(rows)
    assert [row["round"] for row in form["races"]] == [1, 2, 3]
    assert form["average_finish"] == 8


def test_sparse_and_empty_windows_do_not_pad_results():
    assert recent_form_evidence([result(1, 7)])["sample_size"] == 1
    assert recent_form([result(1, 7)]) == 7
    empty = recent_form_evidence([])
    assert empty["sample_size"] == 0
    assert empty["average_finish"] is None
    assert empty["status"] == "no_eligible_results"


def test_latest_metadata_uses_latest_gp_even_if_its_result_is_excluded():
    rows = [result(3, 2, team="Sprint Team", session_type="Sprint"),
            result(2, 1, team="New Team", dsq=True), result(1, 1, team="Old Team")]
    assert get_driver_meta(rows, "NOR")["team"] == "New Team"
    assert build_stats(rows, "NOR")["team"] == "New Team"


def test_unknown_chronology_does_not_choose_the_last_loaded_team():
    rows = [result(1, 1, race_date=None, round=None, team="Unverified Team")]
    assert get_driver_meta(rows, "NOR")["team"] is None
    assert build_stats(rows, "NOR")["team"] == ""


def test_prediction_and_record_are_invariant_to_source_loading_order():
    rows = [result(n, n) for n in range(1, 5)]
    rows += [result(n, 6 - n, abbreviation="PIA", driver_id="piastri", full_name="Oscar Piastri") for n in range(1, 5)]
    baseline = build_h2h_prediction(rows, "NOR", "PIA", "Target GP", target_event=target())
    record = head_to_head_record(rows, "NOR", "PIA")
    for seed in range(12):
        shuffled = rows.copy()
        Random(seed).shuffle(shuffled)
        assert build_h2h_prediction(shuffled, "NOR", "PIA", "Target GP", target_event=target()) == baseline
        assert head_to_head_record(shuffled, "NOR", "PIA") == record
    assert [race["race"] for race in record["races"]] == ["GP 1", "GP 2", "GP 4"]  # Round 3 tied.


def test_driver_swap_swaps_recent_windows_and_prediction_scores():
    rows = [result(1, 2), result(2, 3), result(3, 4),
            result(2, 5, abbreviation="PIA", driver_id="piastri")]
    first = build_h2h_prediction(rows, "NOR", "PIA", "Target GP", target_event=target())
    swapped = build_h2h_prediction(rows, "PIA", "NOR", "Target GP", target_event=target())
    assert first["recent_form"]["driver1"] == swapped["recent_form"]["driver2"]
    assert first["driver1_score"] == swapped["driver2_score"]
    assert first["recent_form"]["driver2"]["sample_size"] == 1


def test_target_and_future_results_cannot_influence_any_prediction_inputs():
    past = [result(1, 3), result(2, 4, abbreviation="PIA", driver_id="piastri")]
    unsafe = [result(5, 1, team="Future Team"), result(6, 1),
              result(1, 1, year=2027, race_date="2027-01-01"),
              result(4, 1, race_date="bad"), result(4, 1, race_date=None, round=None)]
    baseline = build_h2h_prediction(past, "NOR", "PIA", "Target GP", target_event=target())
    prediction = build_h2h_prediction(past + unsafe, "NOR", "PIA", "Target GP", target_event=target())
    assert prediction["history_cutoff"]["excluded_rows"] == 5
    prediction["history_cutoff"]["excluded_rows"] = 0
    assert prediction == baseline


def test_cutoff_rejects_target_identity_even_with_an_incorrect_earlier_date():
    assert before_target([result(5, 1, race_date="2026-03-01")], target()) == []


def test_cutoff_accepts_only_earlier_calendar_rounds_when_dates_are_missing():
    rows = [result(4, 1, race_date=None), result(5, 1, race_date=None),
            result(6, 1, race_date=None), result(24, 1, year=2025, race_date=None)]
    assert [row["round"] for row in before_target(rows, target())] == [4, 24]


def test_unknown_form_is_omitted_from_score_not_assigned_a_neutral_result():
    rows = [result(1, 1, race_date=None, round=None),
            result(2, 3, abbreviation="PIA", race_date=None, round=None)]
    prediction = build_h2h_prediction(rows, "NOR", "PIA", "Target GP")
    assert prediction["recent_form"]["used_in_score"] is False
    assert prediction["driver1_recent_form"] is None
    assert prediction["driver1_score"] == 0.75  # No shared GP, so average finish only.
    assert "not used in the score" in prediction["reasoning"]


def test_api_passes_target_boundary_and_exposes_the_actual_windows(client, monkeypatch):
    def load(year, **kwargs):
        return [result(1, 2, year=year, race_date=f"{year}-03-08"),
                result(2, 3, year=year, race_date=f"{year}-03-15", abbreviation="PIA", driver_id="piastri"),
                result(3, 1, year=year, race_date=f"{year}-09-26")]
    monkeypatch.setattr(h2h, "_load_results", load)
    data = client.get("/api/h2h/predict?driver1=NOR&driver2=PIA").json()
    assert data["history_cutoff"]["target_event"]["round"] == 3
    assert data["history_cutoff"]["excluded_rows"] == 0  # Snapshot already excludes not-yet-due rounds.
    assert data["recent_form"]["driver1"]["races"][-1]["date"] == "2026-03-08"
    assert data["recent_form"]["driver1"]["sample_size"] == 3
    assert data["recent_form"]["driver1"]["spans_seasons"] is True
