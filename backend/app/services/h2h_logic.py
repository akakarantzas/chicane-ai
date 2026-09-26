from app.data.drivers import DRIVER_ROSTER_2026
from app.services.h2h_results import event_key
from app.services.h2h_history import (
    RECENT_FORM_WINDOW, before_target, latest_result, ordered_history, recent_form_evidence,
)
from app.services.h2h_schedule import RaceEvent
from app.services.h2h_uncertainty import assess_evidence
from app.services.h2h_contract import (
    H2H_RULE_VERSION,
    H2H_TARGET,
    H2H_TARGET_DESCRIPTION,
    eligible_prediction_rows,
    final_position,
    published_points,
    result_exclusion_reason,
)


def rows_for_driver(rows: list[dict], abbrev: str) -> list[dict]:
    return [r for r in rows if r["abbreviation"].upper() == abbrev.upper()]


def empty_stats(abbrev: str) -> dict:
    meta = DRIVER_ROSTER_2026[abbrev.upper()]
    return {
        "abbreviation": abbrev.upper(),
        "full_name": meta["full_name"],
        "team": "",
        "number": "",
        "wins": None,
        "podiums": None,
        "points": None,
        "gp_points": None,
        "champ_position": None,
        "championship_status": "unavailable",
        "races": None,
        "best_finish": None,
        "avg_finish": None,
        "finish_sample_size": 0,
        "excluded_results": 0,
        "stats_status": "unavailable",
    }


def build_stats(rows: list[dict], abbrev: str, *, standings: dict | None = None) -> dict:
    """GP metrics describe loaded result entries, not a verified full season.

    Championship points/rank come only from a validated published standings
    snapshot; sprint points never enter GP wins, podiums or average finishes.
    """
    driver_rows = [row for row in rows_for_driver(rows, abbrev)
                   if result_exclusion_reason(row) != "not_grand_prix"]
    stats = empty_stats(abbrev)
    if driver_rows:
        meta = latest_result(driver_rows)
        positions = [final_position(row.get("position")) for row in driver_rows
                     if result_exclusion_reason(row) is None]
        points = [published_points(row.get("points")) if row.get("points_available", True) else None
                  for row in driver_rows]
        missing_finish = any(result_exclusion_reason(row) == "missing_position" for row in driver_rows)
        stats.update({
            "full_name": meta.get("full_name") or stats["full_name"],
            "team": meta.get("team", ""), "number": meta.get("number", ""),
            "wins": sum(position == 1 for position in positions) if not missing_finish else None,
            "podiums": sum(position <= 3 for position in positions) if not missing_finish else None,
            "gp_points": sum(points) if all(value is not None for value in points) else None,
            "races": len(driver_rows),
            "best_finish": min(positions) if positions else None,
            "avg_finish": round(sum(positions) / len(positions), 2) if positions else None,
            "finish_sample_size": len(positions),
            "excluded_results": len(driver_rows) - len(positions),
            "stats_status": "partial" if missing_finish else "loaded_results",
        })
    snapshot = standings or {}
    entry = snapshot.get("drivers", {}).get(abbrev.upper()) if snapshot.get("status") == "available" else None
    if entry:
        ids = {row["driver_id"] for row in driver_rows
               if row.get("driver_id") and not row["driver_id"].startswith("code:")}
        if ids and ids != {entry["driver_id"]}:
            stats["championship_status"] = "identity_conflict"
        else:
            stats.update({"points": entry["points"], "champ_position": entry["champ_position"],
                          "championship_status": "available"})
    return stats


def get_driver_meta(rows: list[dict], abbrev: str) -> dict:
    matches = [row for row in rows_for_driver(rows, abbrev)
               if result_exclusion_reason(row) != "not_grand_prix"]
    if not matches:
        return DRIVER_ROSTER_2026.get(abbrev.upper(), {"full_name": abbrev, "team": "Unknown"})
    return latest_result(matches) or {"full_name": DRIVER_ROSTER_2026.get(abbrev.upper(), {}).get("full_name", abbrev), "team": None}


def average_finish(rows: list[dict]) -> float | None:
    positions = [r["position"] for r in rows if r["position"] is not None]
    return round(sum(positions) / len(positions), 2) if positions else None


def win_rate(rows: list[dict]) -> float:
    if not rows:
        return 0.0
    wins = sum(1 for r in rows if r.get("position") == 1)
    return round(wins / len(rows), 4)


def recent_form(rows: list[dict], n: int = RECENT_FORM_WINDOW) -> float | None:
    return recent_form_evidence(rows, n)["average_finish"]


def head_to_head_record(rows: list[dict], abbrev1: str, abbrev2: str) -> dict:
    abbrev1, abbrev2 = abbrev1.upper(), abbrev2.upper()
    races_map: dict[tuple, dict] = {}
    relevant = [row for row in rows if row["abbreviation"].upper() in {abbrev1, abbrev2}
                and result_exclusion_reason(row) != "not_grand_prix"]
    for row in ordered_history(relevant)[0]:
        key = event_key(row)
        if key not in races_map:
            races_map[key] = {}
        races_map[key][row["abbreviation"].upper()] = row

    driver1_wins = 0
    driver2_wins = 0
    races: list[dict] = []
    tied_races = 0
    excluded_races = 0

    for (year, _, _), drivers in races_map.items():
        if abbrev1 not in drivers or abbrev2 not in drivers:
            excluded_races += 1
            continue

        if any(result_exclusion_reason(drivers[code]) for code in (abbrev1, abbrev2)):
            excluded_races += 1
            continue
        p1 = final_position(drivers[abbrev1].get("position"))
        p2 = final_position(drivers[abbrev2].get("position"))
        if p1 == p2:
            tied_races += 1
            continue

        winner_abbrev = abbrev1 if p1 < p2 else abbrev2
        race = drivers[abbrev1]["race"]
        races.append({"year": year, "race": race, "p1": p1, "p2": p2, "winner": winner_abbrev})
        if winner_abbrev == abbrev1:
            driver1_wins += 1
        else:
            driver2_wins += 1

    return {
        "driver1_wins": driver1_wins,
        "driver2_wins": driver2_wins,
        "total_races": driver1_wins + driver2_wins,
        "tied_races": tied_races,
        "excluded_races": excluded_races,
        "races": races,
    }


def score_prediction(
    rows1: list[dict],
    rows2: list[dict],
    h2h_record: dict,
) -> dict:
    return score_features(driver_features(rows1), driver_features(rows2), h2h_record)


def driver_features(rows: list[dict]) -> dict:
    """Summarize eligible history; callers enforce the event-time cutoff."""
    return {"average_finish": average_finish(rows), "recent_form": recent_form(rows),
            "win_rate": win_rate(rows), "sample_size": len(rows)}


def score_features(features1: dict, features2: dict, h2h_record: dict) -> dict:
    """Shared fixed heuristic for serving and offline evaluation (not calibrated)."""
    avg1, avg2 = features1["average_finish"], features2["average_finish"]
    form1, form2 = features1["recent_form"], features2["recent_form"]
    wr1, wr2 = features1["win_rate"], features2["win_rate"]
    total_h2h = h2h_record["total_races"]

    if total_h2h > 0:
        h2h_score1 = h2h_record["driver1_wins"] / total_h2h
        h2h_score2 = h2h_record["driver2_wins"] / total_h2h
    else:
        h2h_score1 = h2h_score2 = 0.5

    if avg1 is not None and avg2 is not None and (avg1 + avg2) > 0:
        avg_score1 = avg2 / (avg1 + avg2)
        avg_score2 = avg1 / (avg1 + avg2)
    else:
        avg_score1 = avg_score2 = 0.5

    if form1 is not None and form2 is not None and (form1 + form2) > 0:
        form_score1 = form2 / (form1 + form2)
        form_score2 = form1 / (form1 + form2)
    else:
        form_score1 = form_score2 = 0.5

    w_h2h, w_avg, w_form = (0.4, 0.3, 0.3) if total_h2h > 0 else (0.0, 0.5, 0.5)
    if form1 is None or form2 is None:
        w_form = 0.0  # Unknown chronology is not neutral or fabricated form.
    raw1 = h2h_score1 * w_h2h + avg_score1 * w_avg + form_score1 * w_form
    raw2 = h2h_score2 * w_h2h + avg_score2 * w_avg + form_score2 * w_form

    total_score = raw1 + raw2 if (raw1 + raw2) > 0 else 1
    score1 = round(raw1 / total_score, 4)
    score2 = round(raw2 / total_score, 4)

    return {
        "driver1_score": score1,
        "driver2_score": score2,
        "confidence": round(max(score1, score2), 4),
        "driver1_avg_finish": avg1,
        "driver2_avg_finish": avg2,
        "driver1_recent_form": form1,
        "driver2_recent_form": form2,
        "driver1_win_rate": wr1,
        "driver2_win_rate": wr2,
    }


def build_h2h_prediction(rows: list[dict], abbrev1: str, abbrev2: str, next_race: str | None,
                         *, target_event: RaceEvent | None = None) -> dict:
    original_count = len(rows)
    if target_event is not None:
        rows = before_target(rows, target_event)
    rows = ordered_history(rows)[0]
    rows1 = eligible_prediction_rows(rows_for_driver(rows, abbrev1))
    rows2 = eligible_prediction_rows(rows_for_driver(rows, abbrev2))
    meta1 = get_driver_meta(rows, abbrev1)
    meta2 = get_driver_meta(rows, abbrev2)
    h2h = head_to_head_record(rows, abbrev1, abbrev2)
    scores = score_prediction(rows1, rows2, h2h)
    form1, form2 = recent_form_evidence(rows1), recent_form_evidence(rows2)
    form_used = form1["average_finish"] is not None and form2["average_finish"] is not None

    prediction_status, uncertainty = assess_evidence(rows1, rows2, h2h, scores, form1, form2)
    predicted_winner = None
    if prediction_status == "available":
        predicted_winner = abbrev1 if scores["driver1_score"] > scores["driver2_score"] else abbrev2
    winner_meta = (meta1 if predicted_winner == abbrev1 else meta2) if predicted_winner else {}

    if prediction_status == "insufficient_data":
        reasoning = "Not enough eligible Grand Prix results for both drivers to make a prediction."
    elif prediction_status == "insufficient_evidence":
        reasoning = (f"At least {uncertainty['minimum_eligible_races']} eligible Grands Prix per driver are required to show a favorite."
                     if "small_sample" in uncertainty["abstention_reasons"] else
                     "Race chronology could not be verified for both drivers. No favorite is shown.")
    elif prediction_status == "no_clear_favorite":
        reasoning = ("The heuristic scores are tied; no clear favorite."
                     if uncertainty["score_margin"] == 0 else
                     "The heuristic scores are too close to show a clear favorite. This is not a probability estimate.")
    elif h2h["total_races"] > 0:
        d1_wins_label = f"{h2h['driver1_wins']}-{h2h['driver2_wins']}"
        h2h_leader = abbrev1 if h2h["driver1_wins"] >= h2h["driver2_wins"] else abbrev2
        leader_name = (meta1 if h2h_leader == abbrev1 else meta2).get("full_name", h2h_leader).split()[-1]
        reasoning = (
            f"The head-to-head is tied {d1_wins_label}"
            if h2h["driver1_wins"] == h2h["driver2_wins"]
            else f"{leader_name} leads the head-to-head {d1_wins_label}"
        )
        reasoning += " across eligible shared Grands Prix (record shown in selected driver order)."
    else:
        reasoning = "No eligible shared Grands Prix found; the score uses each driver's average finish"
        reasoning += " and recent form." if form_used else "."
    if prediction_status != "insufficient_data" and not form_used:
        reasoning += " Recent form could not be established for both drivers and is not used in the score."

    return {
        "next_race": next_race,
        "target": H2H_TARGET,
        "target_description": H2H_TARGET_DESCRIPTION,
        "rule_version": H2H_RULE_VERSION,
        "prediction_status": prediction_status,
        "history_scope": {"type": "multi_season", "years": sorted({r["year"] for r in rows1 + rows2})},
        "history_cutoff": {"target_event": target_event.public() if target_event else None,
                           "excluded_rows": original_count - len(rows)},
        "recent_form": {"window_size": RECENT_FORM_WINDOW,
                        "policy": "latest_eligible_grands_prix_per_driver", "order": "oldest_to_newest",
                        "used_in_score": form_used, "driver1": form1, "driver2": form2},
        "predicted_winner": predicted_winner,
        "predicted_winner_full_name": winner_meta.get("full_name"),
        "predicted_winner_team": winner_meta.get("team"),
        "confidence": None,  # Deprecated: a heuristic's larger score is not confidence.
        "score_type": "uncalibrated_heuristic",
        "uncertainty": uncertainty,
        "h2h_record": {
            "driver1_wins": h2h["driver1_wins"],
            "driver2_wins": h2h["driver2_wins"],
            "total_races": h2h["total_races"],
            "tied_races": h2h["tied_races"],
            "excluded_races": h2h["excluded_races"],
        },
        "reasoning": reasoning,
        "driver1_score": scores["driver1_score"],
        "driver2_score": scores["driver2_score"],
        "driver1_avg_finish": scores["driver1_avg_finish"],
        "driver2_avg_finish": scores["driver2_avg_finish"],
        "driver1_recent_form": scores["driver1_recent_form"],
        "driver2_recent_form": scores["driver2_recent_form"],
        "driver1_win_rate": scores["driver1_win_rate"],
        "driver2_win_rate": scores["driver2_win_rate"],
    }
