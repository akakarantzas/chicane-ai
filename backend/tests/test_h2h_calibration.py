import json

import pytest

pytest.importorskip("sklearn", reason="install requirements-evaluation.txt for calibration diagnostics")

from app.services.h2h_calibration import audit_calibration, calibrated_score, main, reliability


def rows():
    return [{"year": year, "round": number, "race": f"Race {number}",
             "race_date": f"{year}-03-{number:02}", "abbreviation": code,
             "position": ((index + number // 4) % 3) + 1}
            for year, count in ((2024, 16), (2025, 6), (2026, 2))
            for number in range(1, count + 1) for index, code in enumerate(("NOR", "PIA", "RIC"))]


def test_folds_fit_only_strictly_earlier_races():
    report = audit_calibration(rows())
    assert len(report["folds"]) == 6
    for fold in report["folds"]:
        assert fold["fit"]["latest_date"] < fold["date"]
        assert not set(fold["target_events"]) & set(fold["fit"]["event_ids"])
        assert fold["fit"]["status"] == "fitted"
    assert report["deployment"]["probabilities_available"] is False


def test_2026_labels_cannot_affect_any_diagnostic():
    data = rows()
    original = audit_calibration(data)
    for row in data:
        if row["year"] == 2026:
            row.update(position=99, abbreviation="XXX", driver_id="unrelated", dns=True)
    assert audit_calibration(data) == original


def test_future_labels_do_not_change_earlier_fit():
    data = rows()
    original = audit_calibration(data)
    for row in data:
        if row["year"] == 2025 and row["round"] >= 3:
            row["position"] = 4 - row["position"]
    changed = audit_calibration(data)
    assert original["folds"][:3] == changed["folds"][:3]
    assert original["folds"][3]["fit"]["fit_sha256"] != changed["folds"][3]["fit"]["fit_sha256"]


def test_same_date_is_one_fold_and_never_enters_its_own_fit():
    data = rows()
    for row in data:
        if row["year"] == 2025:
            row["race_date"] = "2025-03-01"
    result = audit_calibration(data)
    assert len(result["folds"]) == 1
    assert len(result["folds"][0]["target_events"]) == 6
    assert result["folds"][0]["fit"]["latest_date"] < "2025-03-01"


def test_sparse_calibration_abstains():
    data = [row for row in rows() if row["year"] != 2024 or row["round"] <= 2]
    report = audit_calibration(data)
    assert all(fold["fit"]["status"] == "insufficient_calibration_races" for fold in report["folds"])
    assert report["common_support"]["calibrated_candidate"]["reliability"]["race_balanced_ece"] is None
    assert report["all"]["calibrated_candidate"]["pair_micro"]["scored_pairs"] == 0


def test_symmetry_ties_rank_and_extreme_values():
    for score in (0, .01, .2, .5, .8, .99, 1):
        value = calibrated_score(score, 1.2)
        assert 0 <= value <= 1
        assert value == pytest.approx(1 - calibrated_score(1 - score, 1.2))
    assert calibrated_score(.5, 1.2) == .5
    assert calibrated_score(.7, 1.2) > calibrated_score(.6, 1.2)
    assert calibrated_score(1, 1000) == 1
    assert calibrated_score(0, 1000) == 0


def test_reliability_counts_original_pairs_and_equal_race_weights():
    pairs = [{"event_id": "first", "label": 1, "scores": {"test": .75}}]
    pairs += [{"event_id": "second", "label": 0, "scores": {"test": .75}} for _ in range(3)]
    result = reliability(pairs, "test")
    assert result["pairs"] == 4
    assert result["races"] == 2
    assert result["race_balanced_ece"] == pytest.approx(.25)
    assert result["bins"][7]["mean_score"] == pytest.approx(.75)
    assert result["bins"][7]["observed_frequency"] == pytest.approx(.5)
    assert result["bins"][0]["mean_score"] is None


def test_determinism_and_invalid_time_boundaries():
    assert audit_calibration(rows()) == audit_calibration(list(reversed(rows())))
    with pytest.raises(ValueError):
        audit_calibration(rows(), evaluation_end="2027-01-01")
    with pytest.raises(ValueError):
        audit_calibration(rows(), evaluation_start="2026-01-01")


def test_offline_cli_and_output_protection(tmp_path, monkeypatch):
    import socket
    def blocked(*args, **kwargs):
        raise AssertionError("calibration must remain offline")
    monkeypatch.setattr(socket.socket, "connect", blocked)
    source, output = tmp_path / "rows.json", tmp_path / "report.json"
    source.write_text(json.dumps(rows()))
    args = ["--input", str(source), "--output", str(output)]
    assert main(args) == 0
    report = json.loads(output.read_text())
    assert report["excluded_rows"] == 6
    previous = output.read_bytes()
    with pytest.raises(SystemExit):
        main(args)
    assert output.read_bytes() == previous
