# Qualifying model accuracy plan

Status: planned; no model or serving behavior changed by this document.

## Objective

Measure and improve how qualifying contributes to race-winning probabilities
relative to driver form, team performance and circuit context. Learn the
relationships from historical data and validate them on later races. Deliver
separate, reproducible pre-qualifying and post-qualifying forecasts with honest
probability estimates and a measured comparison between the stages.

The existing automatic qualifying updater remains the production baseline while
the experiments run. More features or a different blend are candidates, not
assumed improvements.

## Current implementation and gaps

- The Singapore model repository is
  `akakarantzas/f1-2026-singapore-grand-prix-winner-prediction`, checked out locally
  at `.tmp-singapore-model-repo`.
- `train_singapore.py` trains a calibrated histogram gradient boosting model.
  Its initial snapshot contains 1,748 driver rows from 86 races.
- The app's `backend/app/services/post_qualifying.py` replaces projected
  `GridPosition` with official qualifying position in frozen feature rows.
  Inference applies the existing model/form blend and preserves both stages.
- Historical training and evaluation use race starting grids. These differ
  from both pre-qualifying estimates and qualifying classifications before
  penalties. Existing metrics therefore do not measure the live stage uplift.
- Blend selection currently prioritizes top-one accuracy. Calibration groups
  drivers by race, but `StratifiedGroupKFold` does not enforce chronological
  training and calibration windows.
- Qualifying contributes to both the model and the hand-built form score. The
  benefit of this overlap has not been isolated in a controlled comparison.
- The existing 2026 metrics have already been inspected. That period is useful
  for retrospective analysis, but must not be described as an untouched test set.

## 1. Freeze the baseline and define the experiment

Deliverables in the model repository: an experiment configuration and a manifest
of the baseline model, feature bundle, code revision and dependency versions.

- Hash the current exported model, metadata, predictions and inference bundle.
- Define the target as the eventual official race winner among the entrants
  known at forecast time. Retain non-winners who retire or do not start; never
  construct the forecast field from finishers alone.
- Define the pre-qualifying cutoff immediately before Grand Prix qualifying
  begins. Define the post-qualifying cutoff when a complete classification is
  first available after session completion. Keep later grid/penalty updates as
  a separately timestamped stage if added.
- Freeze a small candidate list, fold definitions, metric formulas and the
  promotion rules before inspecting new candidate results.
- Separate historical simulations, candidate shadow forecasts and actual
  published forecasts. Experiments must not write fabricated past forecasts
  into the app's production history.

Acceptance: the saved baseline can be reproduced exactly; the same frozen inputs
produce the same probabilities; the experiment configuration identifies all
artifacts and information cutoffs.

## 2. Build timestamped historical qualifying inputs

Suggested model-repository files: `evaluation/dataset.py`,
`evaluation/build_dataset.py`, `tests/test_qualifying_dataset.py`.

- Begin with the current historical race coverage and audit qualifying coverage.
  Expand to additional full recent seasons only as a recorded experiment change.
- Join calendar, qualifying and race results by stable event and driver identity.
  Sort by actual UTC session dates instead of assuming a hand-maintained race
  list is chronological. Resolve each provider's IDs independently.
- Store qualifying position, Q1/Q2/Q3 times, session timestamps, roster/team
  identities, source URL, retrieval time, snapshot hash and provenance status.
  Keep race outcomes in a separate label table.
- Reconstruct each race's projected grid using only earlier completed races.
  Historical snapshots must use that race's entrants and field size, not the
  hard-coded 2026 lineup.
- Keep qualifying rank, expected starting grid and final race grid distinct.
  Do not substitute final race-grid values into an immediate post-qualifying
  snapshot unless there is evidence those values were already published.
- Label historical tables without publication-time evidence as reconstructed
  data. A table fetched today may contain later corrections. Report a separate
  sensitivity analysis for those races; do not claim exact historical availability.
- Represent missing Q2/Q3 times and no-time classifications explicitly. Distinguish
  elimination, non-participation, invalid data and unavailable source fields where
  supported. Never fill a missing lap time with zero.
- Treat sprint qualifying as a different session. Log coverage and exclusions
  for every scheduled race, including wet, interrupted and unusual sessions.

Acceptance: deterministic dataset manifest and coverage report; tests reject
wrong-race joins, duplicate identities, impossible ranks and target/future race
information. Changing a target race's result must not change its features or
forecast roster. A missing-history fallback must not copy an actual future grid
into the pre-qualifying feature set.

## 3. Measure the current qualifying update

Suggested model-repository files: `evaluation/walk_forward.py`,
`evaluation/metrics.py`, `tests/test_temporal_validation.py`.

Compare three forecasts on the same chronological race cohort: a uniform
reference, a qualifying-position-only reference, and the current model run once
with projected and once with qualifying positions. Use expanding windows of
complete races and fit only on earlier races. Develop on seasons through 2025;
report already-observed 2026 races as retrospective diagnostics, not a pristine
holdout.

Primary metric, averaged equally across races:

`race log loss = -log(probability assigned to the actual winner)`

Every candidate must give each forecast entrant a nonzero probability, so the
score stays finite. A race whose winner was not in the forecast field (for
example a reserve driver who replaced an entrant after the cutoff) has no
assigned probability: exclude it from log loss and Brier score, and report the
number of excluded races next to every comparison.

Secondary metrics: multiclass Brier score per race (sum of squared errors across
the field, then mean across races; this differs from the current flattened
driver-level score), top-one accuracy, top-three coverage and mean winner rank.
Report paired pre-versus-post differences with uncertainty from resampling whole
race weekends, never individual drivers, and give sample sizes in races.

Acceptance: a reproducible race-level report that answers whether the current
qualifying substitution improves probabilities relative to projected positions.

## Later, only if step 3 shows a gain

Decide the next model work from step 3's evidence; do not plan it in detail now.
Whatever follows (stage-specific models, a learned blend, qualifying-pace
features, chronological calibration, shadow operation and promotion) must keep
these rules:

- Never write shadow or candidate artifacts to `backend/app/models`: every 60
  seconds `prediction_history.scan_forecasts` archives any `*_metadata.json` and
  `*_predictions.json` pair there, archived forecasts cannot be deleted, and the
  History page shows the newest one as the published forecast. Keep them in a
  separate directory such as `backend/data/shadow/`, with a test that the
  scanner ignores it.
- Replace the hard-coded `singapore` file names in
  `backend/app/routers/predictions.py` and the post-qualifying worker's default
  `name` with one current-race setting both read, so a new GP needs no code edit.
- Freeze promotion rules before looking at prospective results, never retune
  against a failed test period, and keep the existing updater's safeguards
  (session-completion check, full-roster validation, race-start cutoff, atomic
  publication and last-successful-forecast fallback).

## References

- [Existing automatic qualifying workflow](post-qualifying-predictions.md)
- [scikit-learn: probability calibration](https://scikit-learn.org/1.7/modules/calibration.html)
- [scikit-learn: chronological validation](https://scikit-learn.org/1.5/modules/cross_validation.html)
