import copy
import json

import pytest

pytest.importorskip("sklearn", reason="install requirements-evaluation.txt for candidate evaluation tests")
import numpy as np

from app.services import h2h_models as models
from app.services.h2h_backtest import evaluate, pair_features


def rows():
    data = []
    for year in (2024, 2025, 2026):
        for number in range(1, 11):
            for index, code in enumerate(("NOR", "PIA", "RIC")):
                data.append({"year": year, "round": number, "race": f"Race {number}",
                             "race_date": f"{year}-03-{number:02}", "abbreviation": code,
                             "position": ((index + number // 3) % 3) + 1, "status": "Finished"})
    return data


def records(data=None):
    return evaluate(rows() if data is None else data, validation_start="2025-01-01",
                    test_start="2026-01-01", learning_records=True)["pairs"]


def run(data=None):
    return models.evaluate_candidates(rows() if data is None else data, validation_start="2025-01-01",
                                     test_start="2026-01-01", include_pairs=True)


def force_candidate(monkeypatch):
    original = models.select_candidate
    def select(pairs, audits):
        return original(pairs, audits) | {"selected": "logistic_regression", "reason": "test_forced_candidate"}
    monkeypatch.setattr(models, "select_candidate", select)


def test_learning_records_do_not_change_baseline_scores():
    baseline = evaluate(rows(), validation_start="2025-01-01", test_start="2026-01-01", include_pairs=True)
    learned = records()
    filtered = [{key: pair[key] for key in ("event_id", "split", "drivers", "label", "scores")}
                for pair in learned if pair["split"] != "train"]
    assert filtered == baseline["pairs"]
    assert all(pair["features"] is None for pair in learned if pair["event_id"] == "2024:Race:1")


def test_pair_features_are_antisymmetric():
    first = {"average_finish": 2, "recent_form": 3, "win_rate": .4, "sample_size": 20}
    second = {"average_finish": 5, "recent_form": 4, "win_rate": .1, "sample_size": 9}
    assert pair_features(first, second, 4, 2) == [-v for v in pair_features(second, first, 2, 4)]


def test_equal_race_weights_and_mirrored_labels():
    pairs = [pair for pair in records() if pair["features"] is not None][:4]
    x, y, weights, audit = models.training_data(pairs)
    assert audit["pairs"] == 4 and audit["augmented_rows"] == 8
    assert x[1::2] == pytest.approx(-x[::2])
    assert y[1::2] == pytest.approx(1 - y[::2])
    assert sum(weights[:6]) == pytest.approx(sum(weights[6:]))
    assert sum(weights) == pytest.approx(4)


@pytest.mark.parametrize("candidate", models.CANDIDATES)
def test_models_preserve_driver_swap_and_identical_evidence_ties(candidate):
    train = [pair for pair in records() if pair["split"] == "train"]
    model, audit = models.fit_candidate(candidate, train)
    assert audit["status"] == "fitted"
    vector = [.2, -.1, .6, .2, .1]
    probabilities = models.symmetric_scores(model, [vector, [-v for v in vector], [0] * 5])
    assert probabilities[0] == pytest.approx(1 - probabilities[1])
    assert probabilities[2] == .5


def test_training_cutoffs_and_frozen_model_refit(monkeypatch):
    force_candidate(monkeypatch)
    report = run()
    for audit in report["selection_lock"]["validation_training"].values():
        assert audit["latest_date"] < "2025-01-01"
        assert all(event.startswith("2024:") for event in audit["event_ids"])
    assert report["test_refit"]["latest_date"] < "2026-01-01"
    assert not any(event.startswith("2026:") for event in report["test_refit"]["event_ids"])
    assert "gradient_boosting" not in report["test"]["models"]
    assert report["deployment"]["action"] == "retain_live_heuristic"


def test_test_outcomes_cannot_affect_selection_scaler_or_refit(monkeypatch):
    force_candidate(monkeypatch)
    data = rows()
    original = run(data)
    for row in data:
        if row["year"] == 2026:
            row["position"] = 4 - row["position"]
    changed = run(data)
    assert original["selection_lock"] == changed["selection_lock"]
    assert original["selection_lock_sha256"] == changed["selection_lock_sha256"]
    assert original["test_refit"] == changed["test_refit"]
    assert original["input_sha256"] != changed["input_sha256"]
    for first, second in zip(original["pairs"], changed["pairs"]):
        if first["split"] == "validation" or first["event_id"] == "2026:Race:1":
            assert first["scores"] == second["scores"]
            assert first["features"] == second["features"]


def test_validation_labels_do_not_change_training_fit():
    original = run()
    data = rows()
    for row in data:
        if row["year"] == 2025:
            row["position"] = 4 - row["position"]
    changed = run(data)
    assert original["selection_lock"]["validation_training"] == changed["selection_lock"]["validation_training"]
    assert original["pairs"][0]["scores"] == changed["pairs"][0]["scores"]


def test_same_day_outcomes_do_not_enter_features():
    data = rows()
    for row in data:
        if row["year"] == 2026:
            row["race_date"] = "2026-03-01"
    original = records(data)
    for row in data:
        if row["year"] == 2026 and row["round"] == 1:
            row["position"] = 4 - row["position"]
    changed = records(data)
    assert [p["features"] for p in original] == [p["features"] for p in changed]


def test_determinism_and_no_mutation():
    data = rows()
    before = copy.deepcopy(data)
    assert run(data) == run(list(reversed(data)))
    assert data == before


def test_sparse_training_and_cold_starts_abstain():
    data = [row for row in rows() if row["year"] != 2024 or row["round"] <= 3]
    report = run(data)
    assert report["selection_lock"]["selection"]["selected"] == "heuristic"
    for model in models.CANDIDATES:
        assert report["selection_lock"]["validation_training"][model]["status"] == "insufficient_training_races"
        assert report["validation"]["models"][model]["pair_micro"]["scored_pairs"] == 0
    data = [row for row in rows() if row["abbreviation"] != "RIC" or row["year"] > 2024]
    report = run(data)
    for pair in report["pairs"]:
        if pair["event_id"] == "2025:Race:1" and "RIC" in pair["drivers"]:
            assert pair["features"] is None
            assert all(pair["scores"][name] is None for name in models.CANDIDATES)


def test_training_excludes_dns_and_missing_results():
    data = rows()
    for row in data:
        if row["abbreviation"] == "RIC":
            row["status"] = "DNS"
    assert all("RIC" not in pair["drivers"] for pair in records(data))


def test_selection_gate_uses_coverage_accuracy_and_minimum_races():
    pairs = [{"event_id": str(i), "label": i % 2, "scores": {
        "heuristic": .6 if i % 2 else .4, "logistic_regression": .8 if i % 2 else .2}}
        for i in range(10)]
    gate = lambda: models.evidence_gate(models.compare(pairs, "logistic_regression"), "logistic_regression")
    assert gate()["passes"]
    pairs[0]["scores"]["logistic_regression"] = None
    assert not gate()["checks"]["score_coverage_not_lower"]
    pairs[0]["scores"]["logistic_regression"] = .9
    assert not gate()["checks"]["common_decision_accuracy_not_worse"]
    pairs[:] = pairs[:2]
    assert not gate()["checks"]["enough_races"]


def test_scaler_is_fitted_only_to_training_rows():
    train = [pair for pair in records() if pair["split"] == "train"]
    x, _, weight, _ = models.training_data(train)
    model, _ = models.fit_candidate("logistic_regression", train)
    scaler = model.named_steps["standardscaler"]
    mean = np.average(x, axis=0, weights=weight)
    assert scaler.mean_ == pytest.approx(mean)
    assert scaler.var_ == pytest.approx(np.average((x - mean) ** 2, axis=0, weights=weight))


def test_offline_cli_provenance_hashes_and_no_overwrite(tmp_path, monkeypatch):
    import socket
    def blocked(*args, **kwargs):
        raise AssertionError("evaluation must remain offline")
    monkeypatch.setattr(socket.socket, "connect", blocked)
    source, output = tmp_path / "data.json", tmp_path / "report.json"
    source.write_text(json.dumps({"rows": rows(), "provenance": {"source": "fixture"}}), encoding="utf-8")
    args = ["--input", str(source), "--output", str(output), "--validation-start", "2025-01-01",
            "--test-start", "2026-01-01"]
    assert models.main(args) == 0
    report = json.loads(output.read_text())
    assert report["provenance"] == {"source": "fixture"}
    assert len(report["input_file_sha256"]) == 64
    assert len(report["implementation_sha256"]) == 5
    assert "pairs" not in report
    previous = output.read_bytes()
    with pytest.raises(SystemExit):
        models.main(args)
    assert output.read_bytes() == previous
