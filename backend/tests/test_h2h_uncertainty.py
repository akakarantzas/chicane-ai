import copy

import pytest

from app.services.h2h_logic import build_h2h_prediction
from app.services.h2h_uncertainty import apply_data_uncertainty, assess_evidence


def rows(count=3):
    return [{"abbreviation": code, "position": pos, "race": f"Race {number}", "round": number,
             "year": 2025, "race_date": f"2025-03-{number:02}", "full_name": code}
            for number in range(1, count + 1) for code, pos in (("NOR", 1), ("PIA", 5))]


@pytest.mark.parametrize("count,status", [(0, "insufficient_data"), (1, "insufficient_evidence"),
                                         (2, "insufficient_evidence"), (3, "available")])
def test_minimum_history_and_no_probability(count, status):
    prediction = build_h2h_prediction(rows(count), "NOR", "PIA", "Test GP")
    assert prediction["prediction_status"] == status
    assert prediction["confidence"] is None
    assert prediction["uncertainty"]["driver1_probability"] is None
    assert prediction["uncertainty"]["driver2_probability"] is None
    assert prediction["uncertainty"]["probability_available"] is False
    assert prediction["predicted_winner"] == ("NOR" if count >= 3 else None)


def test_unknown_chronology_abstains_even_with_many_results():
    data = [{key: value for key, value in row.items() if key not in {"round", "race_date"}} for row in rows(4)]
    prediction = build_h2h_prediction(data, "NOR", "PIA", "Test GP")
    assert prediction["predicted_winner"] is None
    assert prediction["uncertainty"]["abstention_reasons"] == ["chronology_unavailable"]


@pytest.mark.parametrize("margin,status", [(0, "no_clear_favorite"), (.0499, "no_clear_favorite"), (.05, "available")])
def test_margin_boundary_and_symmetry(margin, status):
    data = rows()
    scores = {"driver1_score": .5 + margin / 2, "driver2_score": .5 - margin / 2}
    form = {"status": "available"}
    for a, b in (("NOR", "PIA"), ("PIA", "NOR")):
        actual, evidence = assess_evidence([r for r in data if r["abbreviation"] == a],
            [r for r in data if r["abbreviation"] == b], {"total_races": 3}, scores, form, form)
        assert actual == status
        assert evidence["score_margin"] == margin


def test_duplicate_entries_and_exclusions_cannot_satisfy_minimum():
    data = rows(2)
    prediction = build_h2h_prediction(data + copy.deepcopy(data), "NOR", "PIA", "Test GP")
    assert prediction["uncertainty"]["driver1_eligible_races"] == 2
    assert prediction["predicted_winner"] is None
    data = rows(3)
    data[-1]["dns"] = True
    prediction = build_h2h_prediction(data, "NOR", "PIA", "Test GP")
    assert prediction["uncertainty"]["driver2_eligible_races"] == 2
    assert prediction["predicted_winner"] is None


def test_separate_history_is_allowed_but_disclosed():
    data = rows()
    for row in data:
        if row["abbreviation"] == "PIA":
            row["round"] += 3
    prediction = build_h2h_prediction(data, "NOR", "PIA", "Test GP")
    assert prediction["prediction_status"] == "available"
    assert prediction["uncertainty"]["shared_races"] == 0
    assert "separate history" in prediction["uncertainty"]["data_warnings"][0]


def test_stale_and_historical_gaps_warn_without_invented_confidence():
    prediction = build_h2h_prediction(rows(), "NOR", "PIA", "Test GP")
    result = apply_data_uncertainty(prediction,
        {"2024": {"freshness": {"status": "unavailable"}},
         "2025": {"freshness": {"status": "stale"}, "quality": {"conflicting_result_count": 1}},
         "2026": {"freshness": {"status": "fresh"}}},
        {"2025": {"missing_rounds": [2]}, "2026": {"missing_rounds": []}}, 2026)
    assert result["prediction_status"] == "available"
    assert len(result["uncertainty"]["data_warnings"]) == 4
    assert result["confidence"] is None


@pytest.mark.parametrize("coverage", [{"status": "unavailable"}, {"missing_rounds": [1]}])
def test_missing_current_season_withholds_winner(coverage):
    result = apply_data_uncertainty(build_h2h_prediction(rows(), "NOR", "PIA", "Test GP"),
                                    {}, {"2026": coverage}, 2026)
    assert result["prediction_status"] == "data_unavailable"
    assert result["predicted_winner"] is None
    assert result["predicted_winner_full_name"] is None


def test_api_uncertainty_and_current_failure(client, monkeypatch):
    from app.routers import h2h
    def load(year, strict=True):
        return [{**row, "year": year, "race_date": None} for row in rows(2)] if year < 2026 else []
    monkeypatch.setattr(h2h, "_load_results", load)
    result = client.get("/api/h2h/predict?driver1=NOR&driver2=PIA").json()
    assert result["uncertainty"]["driver1_eligible_races"] == 4
    assert result["prediction_status"] == "data_unavailable"
    assert result["confidence"] is None
