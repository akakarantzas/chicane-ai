"""Development-only walk-forward calibration audit; never publishes live probabilities."""

import argparse
from collections import Counter
from datetime import date
import hashlib
from itertools import groupby
import json
import math
from pathlib import Path
import warnings

import numpy as np
import sklearn
from sklearn.exceptions import ConvergenceWarning
from sklearn.linear_model import LogisticRegression
from threadpoolctl import threadpool_limits

from app.services.h2h_backtest import evaluate, summarize


INSPECTED_TEST_START = "2026-01-01"
MIN_CALIBRATION_RACES = 12
BIN_COUNT = 10


def fingerprint(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, allow_nan=False).encode()).hexdigest()


def logit(score):
    p = min(1 - 1e-6, max(1e-6, score))
    return math.log(p / (1 - p))


def fit_calibrator(pairs):
    scored = [pair for pair in pairs if pair["scores"]["heuristic"] is not None]
    counts = Counter(pair["event_id"] for pair in scored)
    audit = {"races": len(counts), "pairs": len(scored), "event_ids": sorted(counts),
             "latest_date": max((pair["date"] for pair in scored), default=None),
             "fit_sha256": fingerprint([{key: pair[key] for key in ("event_id", "drivers", "date", "label")} |
                                        {"score": pair["scores"]["heuristic"]} for pair in scored])}
    if len(counts) < MIN_CALIBRATION_RACES:
        return None, audit | {"status": "insufficient_calibration_races"}
    x, y, weights = [], [], []
    for pair in scored:
        value = logit(pair["scores"]["heuristic"])
        x.extend([[value], [-value]])
        y.extend([pair["label"], 1 - pair["label"]])
        weight = len(scored) / (2 * len(counts) * counts[pair["event_id"]])
        weights.extend([weight, weight])
    model = LogisticRegression(C=1, fit_intercept=False, solver="lbfgs", max_iter=1000)
    with threadpool_limits(limits=1), warnings.catch_warnings():
        warnings.simplefilter("error", ConvergenceWarning)
        model.fit(x, y, sample_weight=weights)
    slope = float(model.coef_[0][0])
    if not math.isfinite(slope) or slope <= 0:
        return None, audit | {"status": "nonpositive_calibration_slope"}
    return slope, audit | {"status": "fitted", "slope": slope}


def calibrated_score(score, slope):
    value = slope * logit(score)
    # Stable logistic transform; symmetry and ranking are preserved.
    result = 1 / (1 + math.exp(-value)) if value >= 0 else math.exp(value) / (1 + math.exp(value))
    return round(result, 12)


def reliability(pairs, model):
    """Race-balanced, orientation-invariant bins; no independent-pair error bars."""
    scored = [pair for pair in pairs if pair["scores"][model] is not None]
    race_counts = Counter(pair["event_id"] for pair in scored)
    bins = [{"lower": i / BIN_COUNT, "upper": (i + 1) / BIN_COUNT,
             "weight": 0.0, "score_sum": 0.0, "label_sum": 0.0, "pairs": set(), "races": set()}
            for i in range(BIN_COUNT)]
    for pair_index, pair in enumerate(scored):
        p, y = pair["scores"][model], pair["label"]
        # Both orientations share the original pair's weight and are counted once per bin.
        for score, label in ((p, y), (1 - p, 1 - y)):
            bucket = bins[min(BIN_COUNT - 1, int(score * BIN_COUNT))]
            weight = 1 / (2 * race_counts[pair["event_id"]])
            bucket["weight"] += weight
            bucket["score_sum"] += weight * score
            bucket["label_sum"] += weight * label
            bucket["pairs"].add(pair_index)
            bucket["races"].add(pair["event_id"])
    result, ece = [], 0.0
    for bucket in bins:
        weight = bucket["weight"]
        mean = bucket["score_sum"] / weight if weight else None
        observed = bucket["label_sum"] / weight if weight else None
        if weight:
            ece += weight * abs(mean - observed)
        result.append({"lower": bucket["lower"], "upper": bucket["upper"],
                       "mean_score": mean, "observed_frequency": observed,
                       "unique_pairs": len(bucket["pairs"]), "races": len(bucket["races"]),
                       "race_weight": weight})
    return {"bins": result, "race_balanced_ece": ece / len(race_counts) if race_counts else None,
            "races": len(race_counts), "pairs": len(scored)}


def audit_calibration(rows, *, evaluation_start="2025-01-01", evaluation_end=INSPECTED_TEST_START):
    start, end = date.fromisoformat(evaluation_start), date.fromisoformat(evaluation_end)
    if start >= end or end > date.fromisoformat(INSPECTED_TEST_START):
        raise ValueError("calibration development must end by 2026-01-01 and start before its end")
    if not isinstance(rows, list):
        raise ValueError("results must be a list")
    # Exclude the inspected test period before normalization, features or fitting.
    used = [row for row in rows if date.fromisoformat(row["race_date"]) < end]
    baseline = evaluate(used, validation_start=evaluation_start, test_start=evaluation_end,
                        learning_records=True, require_all_splits=False)
    pairs = baseline["pairs"]
    history = [pair for pair in pairs if pair["date"] < evaluation_start]
    validation = [pair for pair in pairs if pair["date"] >= evaluation_start]
    if not history or not validation:
        raise ValueError("prior history and development evaluation races are required")
    folds = []
    for day, current_iter in groupby(validation, key=lambda pair: pair["date"]):
        current = list(current_iter)
        slope, audit = fit_calibrator(history)
        for pair in current:
            score = pair["scores"]["heuristic"]
            pair["scores"]["calibrated_candidate"] = calibrated_score(score, slope) if slope is not None and score is not None else None
        folds.append({"date": day, "target_events": sorted({pair["event_id"] for pair in current}), "fit": audit})
        history.extend(current)
    common = [pair for pair in validation if pair["scores"]["heuristic"] is not None
              and pair["scores"]["calibrated_candidate"] is not None]
    return {"schema_version": 1, "experiment": "h2h_calibration_development_v1",
            "used_input_sha256": baseline["input_sha256"], "excluded_rows": len(rows) - len(used),
            "runtime": {"sklearn": sklearn.__version__, "numpy": np.__version__},
            "configuration": {"evaluation_start": evaluation_start, "evaluation_end_exclusive": evaluation_end,
                              "method": "positive_logit_slope_no_intercept", "C": 1,
                              "minimum_calibration_races": MIN_CALIBRATION_RACES, "bins": BIN_COUNT,
                              "history_policy": "strictly_earlier_dates", "race_balanced": True},
            "folds": folds,
            "all": {name: summarize(validation, name) for name in ("heuristic", "calibrated_candidate")},
            "common_support": {name: {"metrics": summarize(common, name), "reliability": reliability(common, name)}
                               for name in ("heuristic", "calibrated_candidate")},
            "deployment": {"probabilities_available": False, "reason": "independent_future_confirmation_required"},
            "limitations": ["2025 was already inspected in model selection; these are development diagnostics, not a blind test.",
                            "2026 and later labels are excluded from all fitting, metrics and selection.",
                            "Thousands of pairs are correlated within and across races; no independent-pair confidence intervals.",
                            "Reliability bins/ECE depend on fixed binning and do not certify future calibration.",
                            "Current corrected results and observed entrants are not point-in-time snapshots.",
                            "This audits raw heuristic scores, not accuracy after the new serving abstention policy."]}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args(argv)
    try:
        if args.output.exists():
            raise ValueError("output already exists")
        content = args.input.read_bytes()
        data = json.loads(content)
        report = audit_calibration(data["rows"] if isinstance(data, dict) else data)
        report["input_file_sha256"] = hashlib.sha256(content).hexdigest()
        report["implementation_sha256"] = {name: hashlib.sha256(Path(__file__).with_name(name).read_bytes()).hexdigest()
            for name in ("h2h_calibration.py", "h2h_backtest.py", "h2h_logic.py", "h2h_history.py", "h2h_contract.py")}
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with args.output.open("x", encoding="utf-8") as stream:
            json.dump(report, stream, indent=2, sort_keys=True, allow_nan=False)
            stream.write("\n")
        print(json.dumps({"output": str(args.output), "folds": len(report["folds"]), "deployment": report["deployment"]}))
    except (OSError, ValueError, KeyError, TypeError, ConvergenceWarning) as exc:
        parser.error(str(exc))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
