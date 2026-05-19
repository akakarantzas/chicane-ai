from app.services.h2h_logic import (
    average_finish,
    build_h2h_prediction,
    build_stats,
    championship_position,
    head_to_head_record,
    recent_form,
)


def result(abbrev, position, points, race, year=2026, full_name=None, team="Test Team", number="0"):
    return {
        "abbreviation": abbrev,
        "full_name": full_name or abbrev,
        "team": team,
        "number": number,
        "position": position,
        "points": points,
        "race": race,
        "year": year,
        "source": "unit-test",
    }


def test_average_finish_and_recent_form_calculation():
    rows = [
        result("NOR", 5, 10, "Race 1"),
        result("NOR", 1, 25, "Race 2"),
        result("NOR", None, 0, "Race 3"),
        result("NOR", 3, 15, "Race 4"),
    ]

    assert average_finish(rows) == 3.0
    assert recent_form(rows) == 3.0
    assert recent_form(rows, n=2) == 2.0


def test_build_stats_and_championship_position():
    rows = [
        result("NOR", 1, 25, "Race 1", full_name="Lando Norris", team="McLaren", number="1"),
        result("NOR", 2, 18, "Race 2", full_name="Lando Norris", team="McLaren", number="1"),
        result("PIA", 3, 15, "Race 1", full_name="Oscar Piastri", team="McLaren", number="81"),
    ]

    stats = build_stats(rows, "NOR")

    assert stats["abbreviation"] == "NOR"
    assert stats["wins"] == 1
    assert stats["podiums"] == 2
    assert stats["points"] == 43
    assert stats["best_finish"] == 1
    assert stats["avg_finish"] == 1.5
    assert championship_position(rows, "NOR") == 1
    assert championship_position(rows, "PIA") == 2


def test_head_to_head_driver1_advantage():
    rows = [
        result("NOR", 1, 25, "Race 1", full_name="Lando Norris", team="McLaren", number="1"),
        result("PIA", 2, 18, "Race 1", full_name="Oscar Piastri", team="McLaren", number="81"),
        result("NOR", 3, 15, "Race 2", full_name="Lando Norris", team="McLaren", number="1"),
        result("PIA", 5, 10, "Race 2", full_name="Oscar Piastri", team="McLaren", number="81"),
    ]

    record = head_to_head_record(rows, "NOR", "PIA")
    prediction = build_h2h_prediction(rows, "NOR", "PIA", "Miami Grand Prix")

    assert record["driver1_wins"] == 2
    assert record["driver2_wins"] == 0
    assert prediction["predicted_winner"] == "NOR"
    assert prediction["driver1_score"] > prediction["driver2_score"]
    assert 0.5 <= prediction["confidence"] <= 1.0


def test_head_to_head_driver2_advantage():
    rows = [
        result("NOR", 4, 12, "Race 1", full_name="Lando Norris", team="McLaren", number="1"),
        result("PIA", 1, 25, "Race 1", full_name="Oscar Piastri", team="McLaren", number="81"),
        result("NOR", 6, 8, "Race 2", full_name="Lando Norris", team="McLaren", number="1"),
        result("PIA", 2, 18, "Race 2", full_name="Oscar Piastri", team="McLaren", number="81"),
    ]

    prediction = build_h2h_prediction(rows, "NOR", "PIA", "Miami Grand Prix")

    assert prediction["h2h_record"]["driver1_wins"] == 0
    assert prediction["h2h_record"]["driver2_wins"] == 2
    assert prediction["predicted_winner"] == "PIA"
    assert prediction["driver2_score"] > prediction["driver1_score"]
    assert 0.5 <= prediction["confidence"] <= 1.0


def test_no_data_case_returns_balanced_scores():
    prediction = build_h2h_prediction([], "NOR", "PIA", "Miami Grand Prix")

    assert prediction["predicted_winner"] == "NOR"
    assert prediction["confidence"] == 0.5
    assert prediction["driver1_score"] == 0.5
    assert prediction["driver2_score"] == 0.5
    assert prediction["driver1_avg_finish"] is None
    assert prediction["driver2_avg_finish"] is None
    assert prediction["h2h_record"] == {
        "driver1_wins": 0,
        "driver2_wins": 0,
        "total_races": 0,
    }
