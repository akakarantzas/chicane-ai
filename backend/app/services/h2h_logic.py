from app.data.drivers import DRIVER_ROSTER_2026


def rows_for_driver(rows: list[dict], abbrev: str) -> list[dict]:
    return [r for r in rows if r["abbreviation"].upper() == abbrev.upper()]


def empty_stats(abbrev: str) -> dict:
    meta = DRIVER_ROSTER_2026[abbrev.upper()]
    return {
        "abbreviation": abbrev.upper(),
        "full_name": meta["full_name"],
        "team": meta["team"],
        "number": meta["number"],
        "wins": 0,
        "podiums": 0,
        "points": 0,
        "races": 0,
        "best_finish": None,
        "avg_finish": None,
    }


def build_stats(rows: list[dict], abbrev: str) -> dict:
    driver_rows = rows_for_driver(rows, abbrev)
    if not driver_rows:
        return empty_stats(abbrev)

    meta = driver_rows[0]
    positions = [r["position"] for r in driver_rows if r["position"] is not None]
    total_points = sum(r["points"] for r in driver_rows)

    wins = sum(1 for p in positions if p == 1)
    podiums = sum(1 for p in positions if p <= 3)
    best_finish = int(min(positions)) if positions else None
    avg_finish = round(sum(positions) / len(positions), 2) if positions else None

    return {
        "abbreviation": meta["abbreviation"],
        "full_name": meta["full_name"],
        "team": meta["team"],
        "number": meta["number"],
        "wins": wins,
        "podiums": podiums,
        "points": total_points,
        "races": len(driver_rows),
        "best_finish": best_finish,
        "avg_finish": avg_finish,
    }


def championship_position(rows: list[dict], abbrev: str) -> int:
    totals: dict[str, float] = {}
    for r in rows:
        key = r["abbreviation"].upper()
        totals[key] = totals.get(key, 0) + r["points"]

    ranked = sorted(totals.items(), key=lambda x: x[1], reverse=True)
    for rank, (key, _) in enumerate(ranked, start=1):
        if key == abbrev.upper():
            return rank
    return len(ranked) + 1 if abbrev.upper() in DRIVER_ROSTER_2026 else -1


def get_driver_meta(rows: list[dict], abbrev: str) -> dict:
    matches = rows_for_driver(rows, abbrev)
    if not matches:
        return DRIVER_ROSTER_2026.get(abbrev.upper(), {"full_name": abbrev, "team": "Unknown"})
    return matches[-1]


def average_finish(rows: list[dict]) -> float | None:
    positions = [r["position"] for r in rows if r["position"] is not None]
    return round(sum(positions) / len(positions), 2) if positions else None


def win_rate(rows: list[dict]) -> float:
    if not rows:
        return 0.0
    wins = sum(1 for r in rows if r.get("position") == 1)
    return round(wins / len(rows), 4)


def recent_form(rows: list[dict], n: int = 3) -> float | None:
    valid = [r for r in rows if r["position"] is not None]
    recent = valid[-n:] if len(valid) >= n else valid
    if not recent:
        return None
    return round(sum(r["position"] for r in recent) / len(recent), 2)


def head_to_head_record(rows: list[dict], abbrev1: str, abbrev2: str) -> dict:
    races_map: dict[tuple, dict] = {}
    for row in rows:
        key = (row["year"], row["race"])
        if key not in races_map:
            races_map[key] = {}
        races_map[key][row["abbreviation"].upper()] = row

    driver1_wins = 0
    driver2_wins = 0
    races: list[dict] = []

    for (year, race), drivers in races_map.items():
        if abbrev1 not in drivers or abbrev2 not in drivers:
            continue

        p1 = drivers[abbrev1].get("position")
        p2 = drivers[abbrev2].get("position")
        if p1 is None or p2 is None:
            continue

        winner_abbrev = abbrev1 if p1 < p2 else abbrev2
        races.append({"year": year, "race": race, "p1": p1, "p2": p2, "winner": winner_abbrev})
        if winner_abbrev == abbrev1:
            driver1_wins += 1
        else:
            driver2_wins += 1

    return {
        "driver1_wins": driver1_wins,
        "driver2_wins": driver2_wins,
        "total_races": driver1_wins + driver2_wins,
        "races": races,
    }


def score_prediction(
    rows1: list[dict],
    rows2: list[dict],
    h2h_record: dict,
) -> dict:
    avg1 = average_finish(rows1)
    avg2 = average_finish(rows2)
    form1 = recent_form(rows1)
    form2 = recent_form(rows2)
    wr1 = win_rate(rows1)
    wr2 = win_rate(rows2)
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


def build_h2h_prediction(rows: list[dict], abbrev1: str, abbrev2: str, next_race: str) -> dict:
    rows1 = rows_for_driver(rows, abbrev1)
    rows2 = rows_for_driver(rows, abbrev2)
    meta1 = get_driver_meta(rows, abbrev1)
    meta2 = get_driver_meta(rows, abbrev2)
    h2h = head_to_head_record(rows, abbrev1, abbrev2)
    scores = score_prediction(rows1, rows2, h2h)

    predicted_winner = abbrev1 if scores["driver1_score"] >= scores["driver2_score"] else abbrev2
    winner_meta = meta1 if predicted_winner == abbrev1 else meta2
    winner_name = winner_meta.get("full_name", predicted_winner).split()[-1]

    if h2h["total_races"] > 0:
        d1_wins_label = f"{h2h['driver1_wins']}-{h2h['driver2_wins']}"
        h2h_leader = abbrev1 if h2h["driver1_wins"] >= h2h["driver2_wins"] else abbrev2
        leader_name = (meta1 if h2h_leader == abbrev1 else meta2).get("full_name", h2h_leader).split()[-1]
        reasoning = (
            f"{leader_name} leads the head-to-head {d1_wins_label} across shared races"
            + (
                f" and has a stronger average finish ({scores['driver1_avg_finish']} vs {scores['driver2_avg_finish']})"
                if scores["driver1_avg_finish"]
                and scores["driver2_avg_finish"]
                and scores["driver1_avg_finish"] != scores["driver2_avg_finish"]
                else ""
            )
            + "."
        )
    else:
        reasoning = (
            f"No shared races found \u2014 prediction based on recent form. "
            f"{winner_name} averages P{scores['driver1_avg_finish'] or '?'} vs P{scores['driver2_avg_finish'] or '?'}."
        )

    return {
        "next_race": next_race,
        "predicted_winner": predicted_winner,
        "predicted_winner_full_name": winner_meta.get("full_name", predicted_winner),
        "predicted_winner_team": winner_meta.get("team", "Unknown"),
        "confidence": scores["confidence"],
        "h2h_record": {
            "driver1_wins": h2h["driver1_wins"],
            "driver2_wins": h2h["driver2_wins"],
            "total_races": h2h["total_races"],
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
