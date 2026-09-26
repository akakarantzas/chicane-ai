# Step 9: honest uncertainty and evidence safeguards

The serving heuristic is unchanged, but its larger score is no longer called a
confidence percentage. No independently confirmed probability calibration is
available for this app yet. The UI explicitly says so rather than displaying
an invented 0%, reusing a raw score as confidence, or publishing an experimental
calibrator after inspecting its development data.

## API and UI contract

- `confidence` is retained for compatibility but is always `null`.
- `score_type` is `uncalibrated_heuristic`. `driver1_score` and `driver2_score`
  remain raw diagnostics, not probabilities. The favorite's score is displayed
  as e.g. `0.73 / 1`, labeled **Heuristic score (not probability)**, never `73%`.
  The UI ignores legacy numeric `confidence`, missing/invalid scores, unexpected
  prediction states and winners outside the selected pair.
- `uncertainty.status` is `uncalibrated`; `probability_available` is false and
  both driver probabilities are null. Report distinct eligible GP counts for
  each driver, shared scored races, the raw score gap, policy thresholds,
  abstention reasons and data warnings. These are evidence descriptions, not
  fitted confidence intervals.

Fixed policy `h2h-evidence-v1`:

| Evidence | Serving behavior |
| --- | --- |
| No eligible history for either driver | `insufficient_data`, no favorite |
| Fewer than 3 distinct eligible GPs for either driver | `insufficient_evidence`, no favorite |
| Unknown chronology for either driver's history | `insufficient_evidence`, no favorite |
| Absolute score difference below 0.05, including exact ties | `no_clear_favorite`, no favorite |
| Current-season data unavailable or missing due calendar races | `data_unavailable`, no favorite |
| Known, sufficient history and a gap of at least 0.05 | May show a heuristic favorite, never calibrated confidence |

Three races is a minimum-evidence safeguard aligned with the existing recent-form
window, not a statistically sufficient sample. The 0.05 gap is an explicit
conservative display policy, not an optimized accuracy threshold. These choices
were not tuned against the inspected 2026 test set. Larger samples/gaps still do
not prove reliability. Duplicate entries and excluded results cannot satisfy the
minimum; eligibility follows the existing finish-ahead rules.

Separate driver histories without shared races can support a heuristic score,
with that limitation disclosed. Historical missing seasons, stale snapshots,
missing historical rounds and retained source disagreements are warnings, not
fabricated probability adjustments. Current-season missing/unavailable results
withhold the favorite even when older history exists. A preseason with no results
due is not automatically a missing-data failure. Existing snapshot details
continue to distinguish absent records from unknown participation.

The new safeguards change which predictions are shown. Step 8's recorded accuracy
describes its original raw-score evaluation coverage, **not** the accuracy after
these serving abstentions. Future monitoring must evaluate both coverage and
accuracy under the versioned serving policy.

## Offline calibration development audit

From `backend`, after installing `requirements-evaluation.txt`:

```powershell
.\venv\Scripts\python.exe -m app.services.h2h_calibration --input evaluation/step8-results-2026-09-26.json --output evaluation/step9-calibration-report.json
```

The audit uses the frozen step-8 dataset, excludes 2026 and later rows before
normalization/features/fitting, and evaluates only 2025. Fit one regularized
positive logit slope with zero intercept (`C=1`) on prior heuristic scores and
outcomes. Require at least 12 earlier scored races. A nonpositive fitted slope
is withheld. This is a symmetry-preserving sigmoid-family development candidate,
not a claim of validated Platt calibration or an automatic deployment artifact.

For each 2025 race date, fit using strictly earlier dates, predict all races on
that date, then add those outcomes for later folds. Each fitting race has equal
total weight; mirrored pairs share the original pair's weight and remain inside
the same time split. No random calibration CV, target-date outcomes or future
labels enter a fold. Record each fit's contributing events, latest date and hash.

Compare raw and candidate scores on common support with pair-micro/race-macro
Brier and log loss. Also report ten fixed-width reliability bins and race-balanced
expected calibration error (ECE), preserving driver-swap symmetry by sharing each
pair's weight across both orientations. Empty bins are null, and bins report unique
pair/race counts, not inflated independent sample counts. Bin membership can
overlap across orientations; do not sum those counts as independent evidence.
No pair-independent confidence intervals are produced.

### Recorded development results

24 chronological 2025 folds; 4,320 common scored pairs across 24 races. All 330
2026 entries were excluded. The first fold fit 4,183 pairs from 23 prior races,
through December 8, 2024. The final fold's history ended November 30, 2025,
before its December 7 target.

| Diagnostic | Raw heuristic | Calibration candidate |
| --- | --- | --- |
| Race-macro Brier | 0.182847 | 0.181210 |
| Race-macro log loss | 0.544914 | 0.539395 |
| Race-balanced ECE (10 bins) | 0.032507 | 0.017391 |

These improvements are **development evidence only**: 2025 was already inspected
during model selection, and neither Brier nor ECE proves future calibration.
Results remain correlated within/across races and depend on corrected provider
classifications. Independent future confirmation is required before serving
probabilities. No calibration weights were added to the live API.

Local report: `backend/evaluation/step9-calibration-report.json` (ignored by Git).
Preserve it and the frozen input to reproduce this exact audit; output overwrite
is refused. The report records runtime and implementation hashes.

```text
used pre-2026 input: 6547d3a65d48447a962d0b72941bf670b2c4189f837d98efe1f32a4119635663
frozen input file:  4d36e2459225b9db0d6b468df7c60ba881def707b940ab62c410023167541dd4
```

Validation: 294 backend tests, 30 frontend tests and the production build passed.
The two existing dependency deprecation warnings remain. The in-app browser was
unavailable, so no visual browser verification is claimed.

Reference: [scikit-learn calibration guidance](https://scikit-learn.org/stable/modules/calibration.html)
distinguishes calibration curves from combined scoring-rule performance and
requires separation of fitting and calibration evidence.
