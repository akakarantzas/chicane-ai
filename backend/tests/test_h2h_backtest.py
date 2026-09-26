import copy
import json
import math

import pytest

from app.services.h2h_backtest import evaluate, main, metrics
from app.services.h2h_logic import build_h2h_prediction


def fixture_rows():
    rows = []
    for year in (2024, 2025, 2026):
        for round_number in (1, 2):
            for index, code in enumerate(("NOR", "PIA", "RIC")):
                rows.append({"year": year, "round": round_number, "race": f"Race {round_number}",
                             "race_date": f"{year}-03-{round_number:02}", "abbreviation": code,
                             "position": ((index + round_number) % 3) + 1, "status": "Finished",
                             "session_type": "Race", "driver_id": code.lower()})
    return rows


def run(rows=None):
    return evaluate(fixture_rows() if rows is None else rows, validation_start="2025-01-01",
                    test_start="2026-01-01", include_pairs=True)


def test_race_grouping_order_and_reproducibility():
    report = run()
    assert report == run(list(reversed(fixture_rows())))
    assert len(report["pairs"]) == 12
    manifest = {race["event_id"]: race for race in report["races"]}
    for pair in report["pairs"]:
        race = manifest[pair["event_id"]]
        assert pair["split"] == race["split"]
        assert pair["drivers"] == sorted(pair["drivers"])
        assert all(manifest[key]["date"] < race["date"] for key in race["history_events"])
    assert {race["split"] for race in manifest.values()} == {"train", "validation", "test"}


def test_scores_match_production_including_historical_drivers():
    rows = fixture_rows()
    report = run(rows)
    manifest = {race["event_id"]: race for race in report["races"]}
    for pair in report["pairs"]:
        event = manifest[pair["event_id"]]
        past = [row for row in rows if row["race_date"] < event["date"]]
        production = build_h2h_prediction(past, *pair["drivers"], event["race"])
        assert pair["scores"]["heuristic"] == production["driver1_score"]


def test_target_and_future_labels_do_not_change_earlier_predictions():
    rows = fixture_rows()
    original = run(rows)
    for row in rows:
        if row["year"] == 2026:
            row["position"] = 4 - row["position"]
    changed = run(rows)
    for before, after in zip(original["pairs"], changed["pairs"]):
        if before["event_id"] != "2026:Race:2":
            assert before["scores"] == after["scores"]
    assert original["input_sha256"] != changed["input_sha256"]


def test_same_day_results_cannot_leak():
    rows = fixture_rows()
    for row in rows:
        if row["year"] == 2026:
            row["race_date"] = "2026-03-01"
    report = run(rows)
    test_pairs = [pair for pair in report["pairs"] if pair["split"] == "test"]
    assert [pair["scores"] for pair in test_pairs[:3]] == [pair["scores"] for pair in test_pairs[3:]]
    for row in rows:
        if row["year"] == 2026 and row["round"] == 1:
            row["position"] = 4 - row["position"]
    assert [pair["scores"] for pair in run(rows)["pairs"]] == [pair["scores"] for pair in report["pairs"]]


@pytest.mark.parametrize("status,reason", [("DNS", "did_not_start"), ("DSQ", "disqualified"),
                                           ("Not classified", "unclassified")])
def test_excluded_results_never_become_labels_or_history(status, reason):
    rows = fixture_rows()
    for row in rows:
        if row["abbreviation"] == "RIC":
            row["status"] = status
    report = run(rows)
    assert all("RIC" not in pair["drivers"] for pair in report["pairs"])
    assert all(race["excluded_pairs"] == {reason: 2} for race in report["races"])


def test_missing_positions_ties_and_retirements():
    rows = fixture_rows()
    rows[-1]["position"] = None
    report = run(rows)
    assert report["races"][-1]["excluded_pairs"] == {"missing_position": 2}
    rows[-1]["position"] = rows[-2]["position"]
    assert run(rows)["races"][-1]["excluded_pairs"] == {"equal_positions": 1}
    rows = fixture_rows()
    rows[-1]["status"] = "Engine"
    assert len(run(rows)["pairs"]) == 12


def test_cold_start_and_common_support():
    rows = [row for row in fixture_rows() if not (row["abbreviation"] == "RIC" and row["year"] == 2024)]
    report = run(rows)
    cold = [pair for pair in report["pairs"] if pair["event_id"] == "2025:Race:1" and "RIC" in pair["drivers"]]
    assert len(cold) == 2
    assert all(pair["scores"]["heuristic"] is None for pair in cold)
    assert all(pair["scores"]["coin_flip"] == 0.5 for pair in cold)
    comparison = report["splits"]["validation"]["comparisons"]["coin_flip"]
    assert comparison["common_scores"]["heuristic"]["pair_micro"]["pairs"] == 4
    assert comparison["common_decisions"]["heuristic"]["pair_micro"]["pairs"] == 0


def test_hand_computed_metrics_and_tie_abstention():
    pairs = [{"event_id": "one", "label": label, "scores": {"test": score}}
             for label, score in [(1, .75), (0, .75), (1, .5), (0, None)]]
    result = metrics(pairs, "test")
    assert result["score_coverage"] == .75
    assert result["decision_coverage"] == .5
    assert result["accuracy"] == .5
    assert result["brier"] == pytest.approx((.0625 + .5625 + .25) / 3)
    assert result["log_loss"] == pytest.approx((-math.log(.75) - math.log(.25) - math.log(.5)) / 3)
    assert metrics([], "test")["accuracy"] is None


def test_race_macro_is_not_pair_weighted():
    from app.services.h2h_backtest import summarize
    pairs = [{"event_id": "one", "label": 1, "scores": {"test": .8}}]
    pairs += [{"event_id": "two", "label": 0, "scores": {"test": .8}} for _ in range(3)]
    result = summarize(pairs, "test")
    assert result["pair_micro"]["accuracy"] == .25
    assert result["race_macro"]["accuracy"] == {"value": .5, "races": 2}


@pytest.mark.parametrize("field,value", [("race_date", None), ("race_date", "2023-03-01"),
    ("round", 0), ("year", True), ("abbreviation", "??"), ("session_type", "Sprint"),
    ("race", ""), ("driver_id", 123)])
def test_invalid_rows_rejected(field, value):
    rows = fixture_rows()
    rows[0][field] = value
    with pytest.raises(ValueError):
        run(rows)


def test_duplicates_inconsistent_events_and_ambiguous_ids_rejected():
    rows = fixture_rows()
    with pytest.raises(ValueError, match="duplicate"):
        run(rows + [copy.deepcopy(rows[0])])
    rows[0]["race"] = "Other"
    with pytest.raises(ValueError, match="inconsistent"):
        run(rows)
    rows = fixture_rows()
    rows[-1]["driver_id"] = "different"
    with pytest.raises(ValueError, match="ambiguous"):
        run(rows)


def test_empty_splits_and_invalid_boundaries_rejected():
    with pytest.raises(ValueError):
        run([])
    with pytest.raises(ValueError, match="each contain"):
        run([row for row in fixture_rows() if row["year"] != 2025])
    with pytest.raises(ValueError, match="precede"):
        evaluate(fixture_rows(), validation_start="2026-01-01", test_start="2025-01-01")


def test_offline_cli_and_no_overwrite(tmp_path, monkeypatch):
    import socket
    def no_network(*args, **kwargs):
        raise AssertionError("offline evaluation attempted network access")
    monkeypatch.setattr(socket.socket, "connect", no_network)
    source, output = tmp_path / "rows.json", tmp_path / "report.json"
    source.write_text(json.dumps(fixture_rows()), encoding="utf-8")
    args = ["--input", str(source), "--output", str(output), "--validation-start", "2025-01-01",
            "--test-start", "2026-01-01", "--include-pairs"]
    assert main(args) == 0
    assert json.loads(output.read_text()) == run()
    previous = output.read_bytes()
    with pytest.raises(SystemExit) as error:
        main(args)
    assert error.value.code == 2
    assert output.read_bytes() == previous
