"""Offline walk-forward evaluation. No provider access or live-model changes.

Run from backend: python -m app.services.h2h_backtest --help
"""

import argparse
from collections import Counter, defaultdict
from datetime import date
import hashlib
from itertools import combinations, groupby
import json
import math
from pathlib import Path
import re

from app.services.h2h_contract import H2H_RULE_VERSION, final_position, result_exclusion_reason
from app.services.h2h_logic import driver_features, score_features


MODELS = ("heuristic", "average_finish", "recent_form", "historical_h2h", "coin_flip")
FEATURE_NAMES = ("average_finish_advantage", "recent_form_advantage", "shared_h2h_advantage",
                 "win_rate_difference", "experience_difference")


def pair_features(first: dict, second: dict, wins1: int, wins2: int) -> list[float]:
    """Antisymmetric differences derived solely from strictly prior results."""
    return [(second["average_finish"] - first["average_finish"]) / 20,
            (second["recent_form"] - first["recent_form"]) / 20,
            (wins1 - wins2) / (wins1 + wins2 + 4),
            first["win_rate"] - second["win_rate"],
            (math.log1p(first["sample_size"]) - math.log1p(second["sample_size"])) / 5]


def normalized_events(rows: list[dict]) -> list[dict]:
    """Require unique, already reconciled race entries with explicit dates."""
    if not isinstance(rows, list) or not rows:
        raise ValueError("input must be a nonempty JSON array of reconciled result rows")
    events = {}
    code_ids, id_codes = defaultdict(set), defaultdict(set)
    for original in rows:
        if not isinstance(original, dict):
            raise ValueError("each result must be an object")
        row = dict(original)
        year, round_number = final_position(row.get("year")), final_position(row.get("round"))
        try:
            day = date.fromisoformat(row.get("race_date", ""))
        except (TypeError, ValueError) as exc:
            raise ValueError("race_date must be an ISO calendar date") from exc
        code = str(row.get("abbreviation", "")).strip().upper()
        name = str(row.get("race") or "").strip()
        if not year or not round_number or day.year != year or not re.fullmatch(r"[A-Z]{3}", code) or not name:
            raise ValueError("valid year, round, race name and three-letter driver code required")
        if str(row.get("session_type", "Race")).strip().casefold() not in {"race", "r"}:
            raise ValueError("only Grand Prix result rows are accepted")
        identity = row.get("driver_id")
        if identity and not isinstance(identity, str):
            raise ValueError("driver_id must be a string")
        if identity and not identity.startswith("code:"):
            code_ids[code].add(identity)
            id_codes[identity].add(code)
        row.update(year=year, round=round_number, race_date=day.isoformat(),
                   abbreviation=code, race=name, position=final_position(row.get("position")),
                   session_type="Race")
        key = f"{year}:Race:{round_number}"
        event = events.setdefault(key, {"event_id": key, "date": day.isoformat(), "race": name, "rows": {}})
        if event["date"] != day.isoformat() or event["race"] != name:
            raise ValueError(f"inconsistent event metadata: {key}")
        if code in event["rows"]:
            raise ValueError(f"duplicate result: {key}/{code}; reconcile sources first")
        event["rows"][code] = row
    if any(len(values) > 1 for values in [*code_ids.values(), *id_codes.values()]):
        raise ValueError("ambiguous driver identities; resolve aliases before evaluation")
    return sorted(events.values(), key=lambda event: (event["date"], event["event_id"]))


def metrics(pairs: list[dict], model: str) -> dict:
    scored = [pair for pair in pairs if pair["scores"][model] is not None]
    decided = [pair for pair in scored if pair["scores"][model] != 0.5]
    correct = sum((pair["scores"][model] > 0.5) == bool(pair["label"]) for pair in decided)
    brier = [(pair["scores"][model] - pair["label"]) ** 2 for pair in scored]
    losses = []
    for pair in scored:
        score = min(1 - 1e-15, max(1e-15, pair["scores"][model]))
        losses.append(-math.log(score if pair["label"] else 1 - score))
    return {"pairs": len(pairs), "races": len({pair["event_id"] for pair in pairs}),
            "scored_pairs": len(scored), "decided_pairs": len(decided),
            "score_coverage": len(scored) / len(pairs) if pairs else None,
            "decision_coverage": len(decided) / len(pairs) if pairs else None,
            "accuracy": correct / len(decided) if decided else None,
            "brier": sum(brier) / len(brier) if brier else None,
            "log_loss": sum(losses) / len(losses) if losses else None}


def summarize(pairs: list[dict], model: str) -> dict:
    by_race = defaultdict(list)
    for pair in pairs:
        by_race[pair["event_id"]].append(pair)
    per_race = [metrics(group, model) for group in by_race.values()]
    macro = {}
    for key in ("accuracy", "brier", "log_loss", "score_coverage", "decision_coverage"):
        values = [row[key] for row in per_race if row[key] is not None]
        macro[key] = {"value": sum(values) / len(values) if values else None, "races": len(values)}
    return {"pair_micro": metrics(pairs, model), "race_macro": macro}


def evaluate(rows: list[dict], *, validation_start: str, test_start: str,
             include_pairs: bool = False, learning_records: bool = False, require_all_splits: bool = True) -> dict:
    validation, test = date.fromisoformat(validation_start), date.fromisoformat(test_start)
    if validation >= test:
        raise ValueError("validation_start must precede test_start")
    events = normalized_events(rows)
    for event in events:
        day = date.fromisoformat(event["date"])
        event["split"] = "train" if day < validation else "validation" if day < test else "test"
    if require_all_splits and {event["split"] for event in events} != {"train", "validation", "test"}:
        raise ValueError("train, validation and test must each contain at least one race")
    canonical_rows = [event["rows"][code] for event in events for code in sorted(event["rows"])]
    digest = hashlib.sha256(json.dumps(canonical_rows, sort_keys=True, allow_nan=False).encode()).hexdigest()
    history, records = defaultdict(list), defaultdict(lambda: [0, 0])
    previous_events, pairs, manifest = [], [], []
    for day, day_events_iter in groupby(events, key=lambda event: event["date"]):
        day_events = list(day_events_iter)
        features = {code: driver_features(driver_rows) for code, driver_rows in history.items()}
        for event in day_events:
            exclusions = Counter()
            eligible_count = 0
            for a, b in combinations(sorted(event["rows"]), 2):
                first, second = event["rows"][a], event["rows"][b]
                reasons = sorted({reason for row in (first, second)
                                  if (reason := result_exclusion_reason(row))})
                if reasons:
                    exclusions["+".join(reasons)] += 1
                    continue
                if first["position"] == second["position"]:
                    exclusions["equal_positions"] += 1
                    continue
                eligible_count += 1
                if event["split"] == "train" and not learning_records:
                    continue
                vector = None
                scores = dict.fromkeys(MODELS)
                scores["coin_flip"] = 0.5
                wins1, wins2 = records[(a, b)]
                shared = wins1 + wins2
                if shared:
                    scores["historical_h2h"] = wins1 / shared
                if a in features and b in features:
                    f1, f2 = features[a], features[b]
                    record = {"driver1_wins": wins1, "driver2_wins": wins2, "total_races": shared}
                    scores["heuristic"] = score_features(f1, f2, record)["driver1_score"]
                    for model in ("average_finish", "recent_form"):
                        scores[model] = f2[model] / (f1[model] + f2[model])
                    if learning_records:
                        vector = pair_features(f1, f2, wins1, wins2)
                pairs.append({"event_id": event["event_id"], "split": event["split"],
                              "drivers": [a, b], "label": int(first["position"] < second["position"]),
                              "scores": scores})
                if learning_records:
                    pairs[-1].update(features=vector, date=day)
            manifest.append({key: event[key] for key in ("event_id", "date", "race", "split")} |
                            {"history_events": list(previous_events), "entries": len(event["rows"]),
                             "eligible_pairs": eligible_count, "excluded_pairs": dict(exclusions)})
        # All events on this UTC date are scored before any outcomes enter history.
        for event in day_events:
            eligible = {code: row for code, row in event["rows"].items() if result_exclusion_reason(row) is None}
            for code in sorted(eligible):
                history[code].append(eligible[code])
            for a, b in combinations(sorted(eligible), 2):
                p1, p2 = eligible[a]["position"], eligible[b]["position"]
                if p1 != p2:
                    records[(a, b)][0 if p1 < p2 else 1] += 1
            previous_events.append(event["event_id"])
    reports = {}
    for split in ("validation", "test"):
        selected = [pair for pair in pairs if pair["split"] == split]
        comparisons = {}
        for model in MODELS[1:]:
            common = [pair for pair in selected if pair["scores"]["heuristic"] is not None
                      and pair["scores"][model] is not None]
            decisions = [pair for pair in common if pair["scores"]["heuristic"] != 0.5
                         and pair["scores"][model] != 0.5]
            comparisons[model] = {
                "common_scores": {name: summarize(common, name) for name in ("heuristic", model)},
                "common_decisions": {name: summarize(decisions, name) for name in ("heuristic", model)}}
        reports[split] = {"models": {model: summarize(selected, model) for model in MODELS},
                          "comparisons": comparisons}
    report = {"schema_version": 1, "rule_version": H2H_RULE_VERSION,
              "input_sha256": digest, "configuration": {"validation_start": validation.isoformat(),
              "test_start": test.isoformat(), "history_policy": "all_strictly_earlier_dates",
              "heuristic": "fixed_serving_weights_v1", "training": "history_warmup_only"},
              "limitations": ["Scores are uncalibrated; Brier/log loss are diagnostics, not confidence validation.",
                              "Pairs within a race are correlated; no independent-pair significance claims.",
                              "Corrected final results are not archived as-published information.",
                              "Entrants come from observed target results; missing entries/races cannot be inferred.",
                              "Later validation/test races use earlier observed outcomes, never future outcomes.",
                              "No tuning, model promotion, or live accuracy improvement is performed."],
              "races": manifest, "splits": reports}
    if include_pairs or learning_records:
        report["pairs"] = pairs
    return report


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--validation-start", required=True)
    parser.add_argument("--test-start", required=True)
    parser.add_argument("--include-pairs", action="store_true")
    args = parser.parse_args(argv)
    try:
        rows = json.loads(args.input.read_text(encoding="utf-8"))
        report = evaluate(rows, validation_start=args.validation_start, test_start=args.test_start,
                          include_pairs=args.include_pairs)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with args.output.open("x", encoding="utf-8") as stream:
            json.dump(report, stream, indent=2, sort_keys=True, allow_nan=False)
            stream.write("\n")
    except (OSError, ValueError, TypeError) as exc:
        parser.error(str(exc))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
