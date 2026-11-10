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

## 3. Compare a small, staged set of models

Suggested files: `evaluation/features.py`, `evaluation/candidates.py`,
`tests/test_forecast_features.py`. Share preprocessing between offline evaluation
and exported inference to prevent training/serving differences.

| Candidate | Purpose |
| --- | --- |
| Uniform and qualifying-only forecasts | Simple reference points for whether the extra stats help |
| Current model with projected versus qualifying positions | Measure the existing updater's effect with the same trained model |
| Stage-specific models, position only | Train pre-qualifying on historical projected positions and post-qualifying on historical qualifying positions |
| Stage-specific model without the form-score blend | Test whether the extra form score improves probabilities |
| Stage-specific model with a learned blend | Fit blend weight and smoothing on earlier validation forecasts, allowing a model-only weight of 1 |
| Position plus qualifying pace | Test the incremental value of lap-time gaps after position is already known |

Use the current boosting family as the starting point; include a regularized
simple model as a reference before searching more complex architectures.

Candidate features:

- Qualifying rank and rank relative to field size.
- Per-segment pace gap: `(driver_time - fastest_time_in_segment) /
  fastest_time_in_segment`, computed separately for Q1, Q2 and Q3. Add segment
  participation/missingness flags. Do not compare a Q1 lap directly with a Q3 lap.
- Recent driver form and team form, computed strictly from prior races.
- Circuit identity/type and pooled circuit interactions. Use shared race history
  across circuits; a few Singapore races alone cannot support a complex model.
- In a later ablation, prior mechanical-retirement rate and teammate-relative
  qualifying pace. Record status-mapping and same-segment comparison rules.
- Shrink sparse circuit win-rate estimates toward a broader prior; do not give
  a one-race record the same evidential strength as a long history.

Keep weather-dependent pace comparisons separate in diagnostics. Add penalties,
practice race pace or weather forecast features only when timestamped historical
and live data can be obtained consistently. They are outside the first release.

Acceptance: every candidate produces one valid probability distribution over
the forecast entrants. Feature-group removal tests quantify the value of
qualifying position, pace, form, circuit context and the extra blend. The same
paired race cohort is used when comparing candidates; also report full coverage.

## 4. Validate chronologically and calibrate the final probabilities

Suggested files: `evaluation/walk_forward.py`, `evaluation/metrics.py`,
`evaluation/report.py`, `tests/test_temporal_validation.py`.

- Use expanding windows of complete races. At every simulated cutoff, fit on
  earlier races only. Hyperparameter search, blend fitting and calibration must
  use earlier chronological windows inside the training period.
- Generate calibration inputs from predictions made without training on those
  races. Replace the nonchronological calibration split. Never split drivers
  from the same race between training, calibration and evaluation.
- Evaluate the complete final pipeline after blending, calibration and
  normalization. Calibrated binary outputs are not automatically calibrated
  after being blended and normalized into a race distribution.
- Prefer a simple calibration method given the small number of independent
  races. Select its parameters using only earlier forecasts. Include explicit
  warm-up requirements and a documented fallback when history is insufficient.
- Develop using historical seasons through 2025. Report already-observed 2026
  races as retrospective evaluation and diagnostics, not a pristine holdout.
  Reserve subsequent, unseen races for prospective confirmation after freezing
  the selected candidate.

Primary metric, averaged equally across races:

`race log loss = -log(probability assigned to the actual winner)`

Every candidate must give each forecast entrant a nonzero probability, so the
score stays finite. A race whose winner was not in the forecast field (for
example a reserve driver who replaced an entrant after the cutoff) has no
assigned probability: exclude it from log loss and Brier score, and report the
number of excluded races next to every comparison.

Secondary metrics:

- Multiclass Brier score per race: sum of squared errors across the field,
  then mean across races. State this convention, which differs from the current
  flattened driver-level binary score.
- Top-one winner accuracy, top-three coverage and mean winner rank.
- Reliability plots comparing forecast probabilities with observed win rates,
  including bin counts and uncertainty.
- Coverage and provider delay; breakdowns by season, circuit group, weather
  availability and qualifying irregularities. Small subgroups are descriptive.

Report paired differences for pre versus post and for each candidate versus the
current updater. Estimate uncertainty by resampling whole race weekends, never
individual drivers; use consecutive-race blocks as a sensitivity check for
within-season dependence. Report the sample count in races, not just driver rows.

Acceptance: leakage tests cover feature generation, training, calibration, blend
selection and all fallbacks. A reproducible report provides race-level forecasts,
metric differences, uncertainty, exclusions and all tested configurations.

## 5. Select a candidate and export it for shadow operation

First rank candidates on the prespecified chronological development folds using
race log loss. Prefer the simpler model when differences are not distinguishable.
Inspect Brier score, reliability and winner accuracy alongside the primary metric.

Before prospective evaluation, freeze the selected candidate and these default
promotion gates:

- Lower paired mean race log loss than the current updater, with the 95%
  race-level uncertainty interval for the difference below zero.
- No worsening of mean Brier score or top-one accuracy on the paired evaluation
  cohort. Report how few races drive each difference and the corresponding
  uncertainty; top-one accuracy is a guardrail, not the tuning objective.
- No data-leakage failures, invalid distributions or silent coverage loss.
- The live input builder reproduces the offline feature definitions and the
  exported inference matches evaluation probabilities.

These are conservative decision rules, not a claim of statistical certainty.
If evidence is inconclusive, continue shadow evaluation or retain the existing
model. Do not retune against a failed test period and call it untouched again.

Export a versioned bundle containing the stage, feature schema, missing-value
rules, model/calibration artifacts, dependency versions, training cutoff and
evaluation-manifest hash. Maintain support for the existing bundle during rollout.

## 6. Integrate the selected pipeline and measure live outcomes

App files likely affected:

- `backend/app/services/qualifying_results.py`: expose validated qualifying times
  and their availability flags if the selected candidate needs them.
- `backend/app/services/post_qualifying.py`: dispatch by bundle schema/stage and
  run the exact exported feature and probability pipeline.
- `scripts/sync_azerbaijan_model.ps1`: validate and publish the complete compatible
  artifact set together.
- `backend/app/routers/predictions.py` and `post_qualifying.py`: replace the
  hard-coded `singapore` file names (router paths and the worker's default
  `name`) with one current-race setting that both read, and take the home page
  banner text from the API instead of naming the race in `Home.jsx`. Today each
  new GP needs code edits in these places, and missing one serves a stale race.
- `backend/app/services/prediction_history.py`: retain stage/model/input versions
  and link paired forecasts without altering historical records.
- Model and backend regression tests for bundle compatibility, timestamp cutoffs,
  missing fields, corrections, provider failures and rollback.

Run the candidate in shadow beside the current updater. Save prospective
pre/post forecasts before the race and score them after official results are
available. Keep candidate records separately identified from forecasts shown to
users. Never write shadow artifacts to `backend/app/models`: every 60 seconds
`prediction_history.scan_forecasts` archives any `*_metadata.json` and
`*_predictions.json` pair there, archived forecasts cannot be deleted, and the
History page shows the newest one as the published forecast. Keep them in a
separate directory such as `backend/data/shadow/`, and add a test that the
scanner ignores it. Update the live comparison report as results arrive; do not promote based
on a single successful weekend or repeated unplanned significance checks.

After the promotion gates are satisfied, make the candidate the active bundle
and retain the previous compatible bundle for rollback. Preserve the existing
session-completion check, full-roster validation, race-start cutoff, atomic
publication, 60-second refresh and last-successful-forecast fallback. For each
new GP, require a matching stage bundle and preflight validation before activation.

Acceptance: end-to-end replay demonstrates pre-qualifying -> post-qualifying ->
scored outcome; both forecasts remain accessible; restart and rollback work;
the API still serves JSON without loading models in request handlers. Frontend
stage labels and polling continue to work. No new monitoring panel is required.

## Delivery order

1. Baseline manifest, experiment configuration and historical coverage audit.
2. Timestamped snapshot builder and fair position-only pre/post backtest.
3. Model-only/blend comparison, then qualifying-pace ablations.
4. Chronological calibration, race-level scoring and comparison report.
5. Frozen candidate bundle, shadow inference and prospective outcome tracking.
6. Evidence-based promotion and reusable setup for subsequent GPs.

The first useful deliverable is item 2: a measured answer to whether the current
qualifying substitution improves probabilities relative to projected positions.
Remaining model changes depend on that evidence.

## References

- [Existing automatic qualifying workflow](post-qualifying-predictions.md)
- [scikit-learn: probability calibration](https://scikit-learn.org/1.7/modules/calibration.html)
- [scikit-learn: chronological validation](https://scikit-learn.org/1.5/modules/cross_validation.html)
