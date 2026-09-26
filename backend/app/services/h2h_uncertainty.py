"""Serving evidence safeguards, not fitted confidence or accuracy guarantees."""

from app.services.h2h_results import event_key


EVIDENCE_POLICY_VERSION = "h2h-evidence-v1"
MIN_ELIGIBLE_RACES = 3
MIN_SCORE_MARGIN = 0.05


def assess_evidence(rows1, rows2, h2h, scores, form1, form2):
    counts = [len({event_key(row) for row in rows}) for rows in (rows1, rows2)]
    margin = round(abs(scores["driver1_score"] - scores["driver2_score"]), 4)
    status, reasons = "available", []
    if not all(counts):
        status, reasons = "insufficient_data", ["missing_driver_history"]
    elif min(counts) < MIN_ELIGIBLE_RACES:
        status, reasons = "insufficient_evidence", ["small_sample"]
    elif any(form["status"] == "chronology_unavailable" for form in (form1, form2)):
        status, reasons = "insufficient_evidence", ["chronology_unavailable"]
    elif margin < MIN_SCORE_MARGIN:
        status, reasons = "no_clear_favorite", ["tied_scores" if margin == 0 else "small_score_margin"]
    uncertainty = {
        "status": "uncalibrated", "policy_version": EVIDENCE_POLICY_VERSION,
        "probability_available": False, "driver1_probability": None, "driver2_probability": None,
        "explanation": "Heuristic scores are not probabilities. Calibrated confidence is not available.",
        "driver1_eligible_races": counts[0], "driver2_eligible_races": counts[1],
        "shared_races": h2h["total_races"], "score_margin": margin,
        "minimum_eligible_races": MIN_ELIGIBLE_RACES, "minimum_score_margin": MIN_SCORE_MARGIN,
        "abstention_reasons": reasons, "data_warnings": [],
    }
    if not h2h["total_races"]:
        uncertainty["data_warnings"].append("No eligible shared races; the score relies on each driver's separate history.")
    return status, uncertainty


def apply_data_uncertainty(prediction, snapshots, coverage, current_year):
    """Annotate history gaps; do not serve a favorite without current due results."""
    warnings = prediction["uncertainty"]["data_warnings"]
    for year, snapshot in snapshots.items():
        freshness = snapshot.get("freshness", {})
        if freshness.get("status") == "stale":
            warnings.append(f"{year} history is stale; later corrections may be missing.")
        elif freshness.get("status") == "unavailable":
            warnings.append(f"{year} history is unavailable.")
        if coverage.get(year, {}).get("missing_rounds"):
            warnings.append(f"{year} history is missing due Grand Prix results.")
        if snapshot.get("quality", {}).get("conflicting_result_count", 0):
            warnings.append(f"{year} sources disagree on some retained results.")
    current = str(current_year)
    season_coverage = coverage.get(current, {})
    current_unavailable = (season_coverage.get("status") == "unavailable"
                           or bool(season_coverage.get("missing_rounds"))
                           or (snapshots.get(current, {}).get("freshness", {}).get("status") == "unavailable"
                               and season_coverage.get("status") != "no_results_due"))
    if current_unavailable:
        prediction.update(prediction_status="data_unavailable", predicted_winner=None,
                          predicted_winner_full_name=None, predicted_winner_team=None,
                          reasoning="Current-season results are unavailable or missing due races. No favorite is shown until the data recovers.")
        prediction["uncertainty"]["abstention_reasons"].append("current_season_data_unavailable")
    return prediction
