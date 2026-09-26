"""Offline candidate selection on validation races, followed by one locked test.

Install requirements-evaluation.txt before running this module. Nothing here is
imported by the serving API, and no fitted model is deployed or deserialized.
"""

import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import platform
import warnings

import numpy as np
import sklearn
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.exceptions import ConvergenceWarning
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from threadpoolctl import threadpool_limits

from app.services.h2h_backtest import FEATURE_NAMES, MODELS, evaluate, summarize


CANDIDATES = ("logistic_regression", "gradient_boosting")
PARAMETERS = {
    "logistic_regression": {"C": 1.0, "fit_intercept": False, "max_iter": 1000,
                            "solver": "lbfgs", "random_state": 17},
    "gradient_boosting": {"max_iter": 100, "max_leaf_nodes": 4, "max_depth": 2,
                          "learning_rate": 0.05, "min_samples_leaf": 40,
                          "l2_regularization": 10.0, "early_stopping": False, "random_state": 17},
}
MIN_TRAIN_RACES = 8
MIN_EVALUATION_RACES = 8
MIN_BRIER_GAIN = 0.002


def fingerprint(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, allow_nan=False).encode()).hexdigest()


def training_data(pairs):
    available = [pair for pair in pairs if pair["features"] is not None]
    counts = Counter(pair["event_id"] for pair in available)
    x, y, weights = [], [], []
    for pair in available:
        vector = pair["features"]
        # Mirroring is augmentation inside the same split, not extra evidence.
        x.extend([vector, [-value for value in vector]])
        y.extend([pair["label"], 1 - pair["label"]])
        weight = len(available) / (len(counts) * counts[pair["event_id"]] * 2)
        weights.extend([weight, weight])
    audit = {"races": len(counts), "pairs": len(available), "augmented_rows": len(x),
             "event_ids": sorted(counts), "latest_date": max((pair["date"] for pair in available), default=None),
             "training_sha256": fingerprint([{key: pair[key] for key in
                 ("event_id", "date", "drivers", "features", "label")} for pair in available])}
    return np.asarray(x), np.asarray(y), np.asarray(weights), audit


def fit_candidate(name, pairs):
    x, y, weights, audit = training_data(pairs)
    if audit["races"] < MIN_TRAIN_RACES:
        return None, audit | {"status": "insufficient_training_races"}
    if name == "logistic_regression":
        model = make_pipeline(StandardScaler(), LogisticRegression(**PARAMETERS[name]))
        fit_kwargs = {"standardscaler__sample_weight": weights,
                      "logisticregression__sample_weight": weights}
    elif name == "gradient_boosting":
        model = HistGradientBoostingClassifier(**PARAMETERS[name])
        fit_kwargs = {"sample_weight": weights}
    else:
        raise ValueError(f"unknown candidate: {name}")
    with threadpool_limits(limits=1), warnings.catch_warnings():
        warnings.simplefilter("error", ConvergenceWarning)
        model.fit(x, y, **fit_kwargs)
    return model, audit | {"status": "fitted"}


def symmetric_scores(model, vectors):
    if not vectors:
        return []
    x = np.asarray(vectors, dtype=float)
    with threadpool_limits(limits=1):
        forward = model.predict_proba(x)[:, 1]
        backward = model.predict_proba(-x)[:, 1]
    # Enforce P(A ahead of B) = 1 - P(B ahead of A), even for tree models.
    return np.round((forward + 1 - backward) / 2, 12).tolist()


def add_scores(pairs, name, model):
    available = [pair for pair in pairs if pair["features"] is not None]
    for pair in pairs:
        pair["scores"][name] = None
    if model is not None:
        scores = symmetric_scores(model, [pair["features"] for pair in available])
        for pair, score in zip(available, scores):
            pair["scores"][name] = score


def compare(pairs, candidate):
    common = [pair for pair in pairs if pair["scores"]["heuristic"] is not None
              and pair["scores"][candidate] is not None]
    decisions = [pair for pair in common if pair["scores"]["heuristic"] != 0.5
                 and pair["scores"][candidate] != 0.5]
    return {"all": {name: summarize(pairs, name) for name in ("heuristic", candidate)},
            "common_scores": {name: summarize(common, name) for name in ("heuristic", candidate)},
            "common_decisions": {name: summarize(decisions, name) for name in ("heuristic", candidate)}}


def evidence_gate(comparison, candidate):
    """Predeclared practical guardrails, not a statistical significance test."""
    h = comparison["common_scores"]["heuristic"]["race_macro"]
    c = comparison["common_scores"][candidate]["race_macro"]
    accuracy_h = comparison["common_decisions"]["heuristic"]["race_macro"]["accuracy"]
    accuracy_c = comparison["common_decisions"][candidate]["race_macro"]["accuracy"]
    all_h = comparison["all"]["heuristic"]["pair_micro"]
    all_c = comparison["all"][candidate]["pair_micro"]
    gain = h["brier"]["value"] - c["brier"]["value"] if h["brier"]["value"] is not None else None
    checks = {
        "enough_races": c["brier"]["races"] >= MIN_EVALUATION_RACES
                         and accuracy_c["races"] >= MIN_EVALUATION_RACES,
        "brier_improves": gain is not None and gain >= MIN_BRIER_GAIN,
        "log_loss_not_worse": c["log_loss"]["value"] is not None
                              and c["log_loss"]["value"] <= h["log_loss"]["value"],
        "common_decision_accuracy_not_worse": accuracy_c["value"] is not None
                                              and accuracy_c["value"] >= accuracy_h["value"],
        "score_coverage_not_lower": all_c["scored_pairs"] >= all_h["scored_pairs"],
        "decision_coverage_not_lower": all_c["decided_pairs"] >= all_h["decided_pairs"],
    }
    return {"passes": all(checks.values()), "checks": checks, "race_macro_brier_gain": gain}


def select_candidate(validation_pairs, fit_audits):
    comparisons = {name: compare(validation_pairs, name) for name in CANDIDATES}
    gates = {name: evidence_gate(comparisons[name], name) for name in CANDIDATES}
    eligible = [name for name in CANDIDATES if fit_audits[name]["status"] == "fitted" and gates[name]["passes"]]
    # Fixed alphabetical tie-break makes equal validation outcomes deterministic.
    selected = min(eligible, key=lambda name: (
        comparisons[name]["common_scores"][name]["race_macro"]["brier"]["value"], name)) if eligible else "heuristic"
    return {"selected": selected, "criterion": "race_macro_brier_with_accuracy_loss_and_coverage_guardrails",
            "gates": gates, "comparisons": comparisons,
            "reason": "validation_guardrails_passed" if eligible else "no_candidate_passed_validation_guardrails"}


def evaluate_candidates(rows, *, validation_start, test_start, provenance=None, include_pairs=False):
    baseline = evaluate(rows, validation_start=validation_start, test_start=test_start, learning_records=True)
    groups = {split: [pair for pair in baseline["pairs"] if pair["split"] == split]
              for split in ("train", "validation", "test")}
    audits = {}
    for name in CANDIDATES:
        model, audits[name] = fit_candidate(name, groups["train"])
        add_scores(groups["validation"], name, model)
    selection = select_candidate(groups["validation"], audits)
    # This record contains no test labels, scores or test-dependent input hash.
    lock = {"validation_start": validation_start, "test_start": test_start,
            "features": FEATURE_NAMES, "parameters": PARAMETERS,
            "minimum_train_races": MIN_TRAIN_RACES, "minimum_evaluation_races": MIN_EVALUATION_RACES,
            "minimum_brier_gain": MIN_BRIER_GAIN,
            "validation_training": audits, "selection": selection,
            "validation_sha256": fingerprint(groups["validation"])}
    selected = selection["selected"]
    refit = None
    if selected != "heuristic":
        model, refit = fit_candidate(selected, groups["train"] + groups["validation"])
        add_scores(groups["test"], selected, model)
    test_comparison = compare(groups["test"], selected) if selected != "heuristic" else None
    test_gate = evidence_gate(test_comparison, selected) if test_comparison else None
    report = {
        "schema_version": 1, "experiment": "h2h_candidates_v1", "rule_version": baseline["rule_version"],
        "input_sha256": baseline["input_sha256"], "provenance": provenance,
        "runtime": {"python": platform.python_version(), "sklearn": sklearn.__version__, "numpy": np.__version__},
        "selection_lock": lock, "selection_lock_sha256": fingerprint(lock),
        "test_refit": refit, "races": baseline["races"],
        "validation": {"models": {name: summarize(groups["validation"], name) for name in (*MODELS, *CANDIDATES)}},
        "test": {"models": {name: summarize(groups["test"], name) for name in dict.fromkeys((*MODELS, selected))},
                 "selected_comparison": test_comparison, "selected_gate": test_gate},
        "deployment": {"action": "retain_live_heuristic",
                       "reason": "offline_experiment_only; calibration_and_review_required_before_promotion"},
        "limitations": baseline["limitations"][:-1] + [
            "Candidate weights/scaler fit on train only for validation; selected candidate refit on train+validation only for test.",
            "Fixed hyperparameters, no random CV or internal early-stopping split; mirrored rows stay within their race split.",
            "Each training race has equal total sample weight; correlated pairs are not independent evidence.",
            "Feature history updates after each date, but model weights are frozen throughout each evaluation split.",
            "Validation/test gates are practical thresholds, not statistical proof or calibrated probabilities.",
            "Only the validation-selected approach is tested; do not retune using this test report.",
            "The test period is now inspected and cannot be reused as unseen evidence for subsequent changes.",
            "No qualifying, weather, circuit, or current team inputs: only historically available result features."]}
    if include_pairs:
        report["pairs"] = groups["validation"] + groups["test"]
    return report


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--validation-start", required=True)
    parser.add_argument("--test-start", required=True)
    parser.add_argument("--include-pairs", action="store_true")
    args = parser.parse_args(argv)
    try:
        if args.output.exists():
            raise ValueError("output already exists; choose a new report path")
        data = json.loads(args.input.read_text(encoding="utf-8"))
        rows = data["rows"] if isinstance(data, dict) else data
        provenance = data.get("provenance") if isinstance(data, dict) else None
        report = evaluate_candidates(rows, validation_start=args.validation_start, test_start=args.test_start,
                                     provenance=provenance, include_pairs=args.include_pairs)
        report["input_file_sha256"] = hashlib.sha256(args.input.read_bytes()).hexdigest()
        report["implementation_sha256"] = {path.name: hashlib.sha256(path.read_bytes()).hexdigest()
            for path in (Path(__file__), Path(__file__).with_name("h2h_backtest.py"),
                         Path(__file__).with_name("h2h_logic.py"), Path(__file__).with_name("h2h_contract.py"),
                         Path(__file__).with_name("h2h_history.py"))}
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with args.output.open("x", encoding="utf-8") as stream:
            json.dump(report, stream, indent=2, sort_keys=True, allow_nan=False)
            stream.write("\n")
        print(json.dumps({"output": str(args.output), "selected": report["selection_lock"]["selection"]["selected"],
                          "deployment": report["deployment"]}))
    except (OSError, ValueError, KeyError, TypeError, ConvergenceWarning) as exc:
        parser.error(str(exc))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
