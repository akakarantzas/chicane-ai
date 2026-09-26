"""Coverage describes observed records, never assumed participation."""

from collections import Counter

from app.services.h2h_contract import result_exclusion_reason


def snapshot_quality(snapshot, drivers):
    rows = snapshot["rows"]
    expected = set(snapshot["coverage"]["expected_rounds"])
    driver_coverage = {}
    for code in drivers:
        matches = [row for row in rows if row["abbreviation"].upper() == code]
        observed = {row.get("round") for row in matches} & expected
        eligible = {row.get("round") for row in matches if result_exclusion_reason(row) is None} & expected
        driver_coverage[code] = {
            "observed_rounds": sorted(observed), "eligible_rounds": sorted(eligible),
            "no_result_rounds": sorted(expected - observed),
            "excluded_result_count": sum(result_exclusion_reason(row) is not None for row in matches),
        }
    return {
        "drivers": driver_coverage,
        "selected_source_counts": dict(sorted(Counter(row.get("source", "unknown") for row in rows).items())),
        "conflicting_result_count": sum(bool(row.get("conflicting_sources")) for row in rows),
        "code_only_identity_count": sum(row.get("identity_basis") == "driver_code" for row in rows),
    }
