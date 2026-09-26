# Step 8: candidate model evaluation

This is an offline experiment, not a change to the live H2H model. The serving
API does not import scikit-learn or load experimental model artifacts.

## Fixed experiment protocol (v1)

The following choices are fixed before running the real-data benchmark:

- Training targets: 2024 races, with the first usable results providing history
  warmup. Validation: 2025. Test: available completed 2026 races. Whole races
  stay together; only strictly earlier dates contribute to target features.
- Two fixed candidates: L2-regularized logistic regression (`C=1`, no intercept,
  weighted standardization), and histogram gradient boosting (100 iterations,
  learning rate 0.05, depth 2, at most 4 leaves, at least 40 augmented rows per
  leaf, L2 regularization 10). Seed 17; no hyperparameter search, random CV, or
  internal early-stopping validation split.
- Five signed, driver-relative features: historical average-finish advantage
  divided by 20, last-three-finish advantage divided by 20, shared H2H win
  difference divided by shared races plus 4, historical win-rate difference,
  and log-history-size difference divided by 5. The fixed divisors and H2H
  shrinkage are design choices, not tuned on evaluation results.
- No current-result team, qualifying, weather or circuit features. No driver-code
  identifier features. Missing eligible history for either driver means abstain;
  do not invent a feature vector. Historical entrants remain included.
- Each training race has equal total weight, normalized to the number of original
  training pairs. Mirror each training pair inside its own split with half its
  weight and the reversed label. These are not independent new observations.
  Fit the scaler only on weighted training features. Symmetrize predictions as
  `(p(x) + 1 - p(-x)) / 2`, rounded to 12 places; identical features tie at 0.5.
- Require at least 8 usable training races. Train candidates on training only,
  freeze weights for the entire validation period, and compare with all step-7
  baselines. Historical features still update after each completed date.
- Select using validation only: at least 8 common scored and common decided
  races; race-macro Brier gain of at least 0.002; no worse race-macro log loss
  or common-decision accuracy; no lower score or decision coverage. Choose the
  lowest Brier among passing candidates, with an alphabetical tie-break.
  Otherwise select the existing heuristic. These are practical guardrails,
  **not** significance tests or guarantees of improvement.
- Hash the selection record (without test labels/results). Refit only a selected
  learned candidate on training plus validation; freeze it throughout test.
  Evaluate only that selected approach and the existing simple baselines on
  test. Apply the same guardrails to describe test evidence, not to choose a
  different candidate. Never tune again using this test period.
- Always leave the live heuristic in place in this step. Promotion requires
  calibration, evidence review and a separate integration change. An inspected
  2026 test period is no longer unseen evidence for future experiments.

## Run and preserve evidence

From `backend`, install the optional evaluation dependencies and export data:

```powershell
.\venv\Scripts\python.exe -m pip install -r requirements-evaluation.txt
.\venv\Scripts\python.exe -m app.services.h2h_dataset --output evaluation/step8-results-2026-09-26.json
.\venv\Scripts\python.exe -m app.services.h2h_models --input evaluation/step8-results-2026-09-26.json --output evaluation/step8-model-report.json --validation-start 2025-01-01 --test-start 2026-01-01 --include-pairs
.\venv\Scripts\python.exe -m pytest tests -q
```

Export is explicitly online; model evaluation is offline. Export uses the existing
Jolpica adapter, with FastF1 only for calendar races missing from its date-matched
results. It records due calendars, missing-round checks, fallback rounds, selected
row sources and retrieval times. Fail rather than export missing rounds or rows
dropped by reconciliation. This does not independently verify each classification
or prove complete driver coverage; both providers may share underlying data.

Both CLIs refuse existing output paths. Keep frozen JSON and reports in ignored
`backend/evaluation/`, alongside the repository commit. Reports contain canonical
input and actual file hashes, implementation hashes, dependency versions,
training event manifests/hashes, selection lock and optional pair-level evidence.
Preserve these local artifacts to reproduce the exact run; refetching later may
return corrected results and a different hash. Bare JSON result arrays also work,
but have no exported provenance attached to the report.

Tests with only core requirements skip the optional model test module. Install
`requirements-evaluation.txt` for the full model checks; exporter/backtest tests
remain part of the core suite.

## Interpretation limits

The number of independent race groups is small even when there are thousands of
pair rows. Report both race-macro and pair-micro metrics and coverage; compare
losses on common scores and accuracy on common decisions. Do not infer confidence
intervals from independent pairs. Brier/log loss evaluate uncalibrated model scores;
good values do not establish trustworthy per-prediction confidence.

Current corrected final results and retrospective observed entrants are not true
as-published pre-race snapshots. Sparse training, era/regulation changes, provider
gaps, and correlations across races limit conclusions. Step 9 must not reuse the
inspected test labels to claim independently verified calibration; use earlier
chronological calibration folds and reserve new future races for confirmation.

## Recorded benchmark: September 26, 2026

Export completed at 17:17:26 UTC. The 1,288 observed driver entries cover 63
calendar races: 479 entries/24 races in 2024, 479/24 in 2025, and 330/15 in 2026
through Azerbaijan. No due calendar rounds were absent after fallback. The 2024
Las Vegas result date from Jolpica was November 23 while the calendar's UTC race
date was November 24; that race was filled from FastF1 and recorded in provenance,
not silently date-shifted. No live adapter behavior was changed.

Training had 4,183 feature-eligible pairs across 23 races (the first race supplies
warmup). Validation had 4,374 eligible outcome pairs; all three models supplied
scores for the same 4,320 pairs across 24 races. Metrics below are race-macro;
accuracy uses each model's decided subset, so consult common-decision comparisons
in the full report before comparing accuracy directly.

| Model | Brier (lower is better) | Log loss | Accuracy on decided pairs | Decided pairs |
| --- | --- | --- | --- | --- |
| Existing heuristic | 0.182847 | 0.544914 | 71.49% | 4,319 |
| Logistic regression | 0.181808 | 0.540700 | 71.82% | 4,320 |
| Gradient boosting | 0.182578 | 0.542218 | 71.84% | 4,305 |

Neither candidate passed the fixed validation gate. Logistic regression's Brier
gain was 0.001039, below 0.002. Gradient boosting's gain was 0.000269 and it also
reduced decision coverage. Both passed the common-decision accuracy and log-loss
checks, but these small gains are not grounds to relax the predefined threshold
after seeing results. Selection retained the heuristic; neither learned candidate
was evaluated on test or deployed.

On the 15-race 2026 test period, the selected heuristic scored/decided 3,306 of
3,325 eligible outcome pairs. Race-macro accuracy was 70.11%, Brier 0.196551,
and log loss 0.580931. Pair-micro accuracy was 70.36%. These are retrospective
finish-ahead results on the supplied data, **not** race-winner accuracy,
per-prediction confidence, or a guarantee about future races.

Frozen local artifacts (intentionally ignored by Git):

- `backend/evaluation/step8-results-2026-09-26.json`
- `backend/evaluation/step8-model-report.json`

Recorded hashes:

```text
canonical input: 02fd6e5a07d856a3f821dd6528a831b6f6ae3c3f45c78c781d1394f79506fd85
input file:     4d36e2459225b9db0d6b468df7c60ba881def707b940ab62c410023167541dd4
selection lock: 3b91ea6813ca04ed0a4e00dcb7fc33352318041106f5001cfb1707af3a97650e
```

Runtime: Python 3.14.5, scikit-learn 1.9.1, NumPy 2.5.3. The report also records
the implementation file hashes used for this run. Full validation: 271 backend
tests passed with the two existing dependency deprecation warnings. The live
prediction model and frontend were not modified.

Implementation references: [LogisticRegression](https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.LogisticRegression.html),
[HistGradientBoostingClassifier](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.HistGradientBoostingClassifier.html),
and [cross-validation cautions](https://scikit-learn.org/stable/modules/cross_validation.html).
