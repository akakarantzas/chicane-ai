# Offline H2H backtesting

This evaluates the existing fixed heuristic; it does not train, tune, calibrate,
or replace the live model. Run from `backend` with the backend environment:

```powershell
.\venv\Scripts\python.exe -m app.services.h2h_backtest --input evaluation/results.json --output evaluation/report.json --validation-start 2025-01-01 --test-start 2026-01-01 --include-pairs
```

The evaluator never fetches data. Supply a frozen JSON array of **reconciled
Grand Prix result rows**, using the existing source adapters and reconciliation
service upstream. Keep the input, retrieval time, source provenance, calendar
coverage and repository commit alongside each report. Generated artifacts belong
in ignored `backend/evaluation/`; they are not automatically committed. Output
creation fails if the report already exists, protecting previous evaluations.

Each row needs `year`, `round`, `race`, ISO `race_date` (`YYYY-MM-DD`), and a
three-letter `abbreviation`. Preserve `position`, `status`, `classified_position`,
`dns`, `dsq`, `driver_id`, and source metadata when available; missing positions
are excluded, not imputed. `session_type` defaults to `Race`; explicit non-GP
sessions are rejected. Example row (illustrative, not a real result):

```json
{"year": 2024, "round": 1, "race": "Example Grand Prix", "race_date": "2024-03-02", "abbreviation": "NOR", "driver_id": "norris", "position": 2, "status": "Finished", "session_type": "Race"}
```

Duplicate driver/event entries, conflicting event names/dates, invalid chronology,
and ambiguous provider identities fail validation. Historical drivers need not
belong to the current roster. Missing provider IDs rely on stable driver codes,
not independently verified identity. The normalized, sorted input SHA-256 makes
input order irrelevant while tracking changes to supplied result evidence.

## Evaluation policy

- Explicit date boundaries partition whole races into training/warmup,
  validation and test. Each split must contain a race. Training is only history
  warmup for this fixed heuristic, not parameter fitting.
- Walk forward chronologically using only strictly earlier calendar dates.
  All events on one date are scored before any of that date's outcomes enter
  history. Earlier validation/test outcomes may inform later races, as in live
  operation; future outcomes never do. No random pair splitting.
- Evaluate each unordered pair of observed entrants once. Apply the serving
  finish-ahead contract to labels and history. Report exclusion reasons and
  equal-position pairs. Unknown entrants/missing races cannot be inferred from
  result rows alone; verify calendar and driver coverage before interpreting
  any real report. Zero eligible pairs is an empty evaluation, not 0% accuracy.
- Compare the unchanged serving heuristic with average-finish ratio,
  last-three-eligible-finish ratio, historical shared-race win fraction, and
  constant 0.5. No-history models abstain. Score 0.5 is a tie with no winner;
  the coin-flip baseline is deterministic, not a randomly chosen driver.
- Report score/decision coverage, accuracy on decided pairs, and diagnostic
  Brier/log loss for uncalibrated scores. Log loss alone clips endpoint scores
  to `[1e-15, 1 - 1e-15]`. No fabricated probability or calibration claim.
- Pair-micro metrics weight pairs; race-macro metrics average per-race metrics
  equally and disclose contributing race counts. A race with no usable values
  does not enter that metric's average; all races remain in the manifest.
- Baseline comparisons provide common-score support for loss comparisons and
  common-decision support for accuracy comparisons. Comparing individual model
  accuracy on different subsets is not evidence of superiority.

`--include-pairs` adds target labels and scores for audit. The race manifest
always includes split membership, strictly prior history event IDs, entry counts,
eligible pairs and exclusions. Corrected final classifications are **not** an
archive of what was published before each historical race. This is an event-time
backtest, not a fully point-in-time dataset. Freeze preprocessing/model choices
using validation only before inspecting a held-out test; repeated test-driven
selection invalidates its status as unseen evidence.

Step 7 is verified with deterministic synthetic fixtures and serving-score parity
tests, not a measured real-world accuracy claim. A provenance-checked historical
dataset and actual candidate comparisons remain work for step 8.
