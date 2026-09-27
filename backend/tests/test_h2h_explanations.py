import pytest

from app.services.h2h_logic import build_h2h_prediction, score_features


@pytest.mark.parametrize("shared,forms", [(True, True), (False, True), (True, False), (False, False)])
def test_contributions_reconstruct_exact_scoring_and_renormalization(shared, forms):
    f1 = {"average_finish": 3, "recent_form": 2 if forms else None, "win_rate": .1}
    f2 = {"average_finish": 6, "recent_form": 5 if forms else None, "win_rate": .2}
    record = {"total_races": 4 if shared else 0, "driver1_wins": 3 if shared else 0, "driver2_wins": 1 if shared else 0}
    result = score_features(f1, f2, record)
    for driver in (1, 2):
        assert round(sum(c[f"driver{driver}_contribution"] for c in result["components"]), 4) == result[f"driver{driver}_score"]
    assert sum(c["weight"] for c in result["components"]) == pytest.approx(1)
    assert result["components"][0]["weight"] == (pytest.approx(.4 if forms else .4 / .7) if shared else 0)
    assert result["components"][2]["weight"] == (pytest.approx(.3 if shared else .5) if forms else 0)


def test_neutral_fallback_is_disclosed_not_invented_evidence():
    result = build_h2h_prediction([], "NOR", "PIA", "Test")
    assert result["explanation"]["components"][1]["basis"] == "neutral_fallback"
    assert result["explanation"]["components"][1]["driver1_input"] is None
    assert result["confidence"] is None
    assert result["predicted_winner"] is None


def test_explanation_driver_order_and_symmetry():
    rows = [{"year": 2025, "round": n, "race": str(n), "abbreviation": code, "position": position}
            for n in (1, 2, 3) for code, position in (("NOR", 2), ("PIA", 5))]
    forward = build_h2h_prediction(rows, "NOR", "PIA", "Test")
    reverse = build_h2h_prediction(rows, "PIA", "NOR", "Test")
    assert forward["explanation"]["driver_order"] == ["NOR", "PIA"]
    for a, b in zip(forward["explanation"]["components"], reverse["explanation"]["components"]):
        assert a["driver1_contribution"] == b["driver2_contribution"]
        assert a["weight"] == b["weight"]
