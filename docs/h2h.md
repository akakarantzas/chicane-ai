# H2H technical reference

H2H predicts which of two selected drivers finishes ahead in the next Grand Prix.
The API target is `finish_ahead`, with scoring rules `finish-ahead-v1`.
This feature is separate from the full-field race-winner forecasts in Predictions.

## Finish-ahead rules

| Published result | Treatment |
| --- | --- |
| Both drivers have eligible final positions | The lower position wins. |
| A driver retires | Use the published final position if otherwise eligible. |
| Either driver does not start, qualify, or is withdrawn | Exclude the pair. |
| Either driver is disqualified, excluded, or explicitly unclassified | Exclude the pair, even if a numeric position is supplied. |
| Either driver has no result or a missing/invalid position | Exclude the pair; do not invent a last-place finish. |
| Equal final positions | Record separately; neither driver receives a win. |
| Sprint, qualifying, or practice results | Exclude from Grand Prix H2H history. |

Positions must be finite positive integers. Retirement alone does not mean
unclassified, and zero laps alone does not establish a non-start. The record
reports scored, equal-position and excluded counts. Excluded counts cover events
where at least one selected driver has a result; they do not measure season
completeness. Swapping drivers preserves eligibility and swaps their wins.

## Calendars and result sources

The app supports history from 2024–2026 and a 2026 driver roster. Calendars come
from FastF1, with Jolpica as a fallback, and are cached for 30 minutes. Calendar
discovery does not automatically update the roster for another season.

Grand Prix sessions are selected using UTC dates, including on sprint weekends.
Testing and explicitly cancelled events are ignored. Result lookup becomes due
four hours after a confirmed start, or on the next UTC day for date-only events.
That buffer is not proof of completion: a published winner and valid session
evidence are still required. Unknown start times remain unconfirmed. Failure of
both calendar sources returns HTTP 502; a valid calendar without a future event
returns `no_upcoming_race`.

Results are reconciled by season, calendar event, session and driver identity:

- Prefer Jolpica, then FastF1, then OpenF1. Fallback sources fill absent driver
  rows; status, position and points stay together rather than being mixed.
- Preserve provider driver IDs. Code-only identities are explicitly labelled;
  ambiguous identities or conflicting outcomes within the preferred source are
  quarantined. Historical car numbers resolve through session-specific drivers.
- Match provider events by calendar dates when round numbering differs. Reject
  mismatched events and non-race rows; deduplicate repeated results and pages.
- Retain source/conflict metadata. Source preference is a reconciliation policy,
  not a guarantee that a provider is freshest or independently verified.

Coverage reports expected, loaded and missing rounds. `all_due_rounds_present`
means each due round has result rows, not that every driver or points total is
complete. A driver's absent result can mean missing data or non-participation.

## Season statistics and prediction history

Championship points and rank come from validated published Jolpica standings,
including sprint points and adjustments. The app does not reconstruct championship
tie-breaks or substitute GP-only totals. Standings must match the season and
latest due event; stale, incomplete or conflicting values are withheld.

`gp_points` is a separate subtotal of loaded Grand Prix points. Unknown points
remain null rather than zero. GP wins, podiums, best finish and average finish
use eligible results under the finish-ahead rules. **GP Result Entries** counts
loaded rows, including non-start entries; it is not a verified race-start count.
Missing data is shown as unavailable or partial, with sample sizes.

The season overview covers the requested season. Prediction evidence can span
multiple seasons, identified separately in the response. Recent form is each
driver's last three available eligible GP finishes, ordered chronologically.
Windows can cross seasons and teams; fewer than three results are not padded.

Calendar dates determine chronology. Numeric rounds can serve as a fallback
within a season when the ordering is reliable. Uncertain chronology leaves form
unavailable. Target-event, same-date and later results are excluded from all
prediction evidence. These event-time checks cannot undo later provider
corrections to older classifications.

## Predictions and uncertainty

The live model is `h2h-heuristic-v1`. Shared H2H record, average finish and recent
form normally contribute weights of 0.4/0.3/0.3. Without shared races, average
finish and form receive 0.5/0.5. Missing form is omitted and the remaining weights
are normalized. Explanations show the inputs, effective weights and arithmetic
contributions in selected-driver order.

Scores are uncalibrated. The compatibility `confidence` field is null and driver
probabilities are unavailable. Policy `h2h-evidence-v1` withholds a favorite for
insufficient history, fewer than three eligible GPs per driver, unknown chronology,
a score gap below 0.05, or missing/unavailable current-season due results. Ties
and missing evidence have explicit response states. These thresholds are display
safeguards, not measured confidence levels.

Offline learned candidates did not meet the evaluation criteria for replacing
the heuristic. Historical evaluation does not guarantee future accuracy, and
already-inspected periods cannot be reused as unseen validation evidence.

## Caching and deployment

Comparison and prediction share a process-local season snapshot of reconciled
GP results and standings. A per-season lock prevents concurrent duplicate loads;
callers receive independent copies.

| Setting | Behavior |
| --- | --- |
| Current-season cache | 15 minutes by default |
| Historical-season cache | Six hours by default |
| `H2H_CACHE_TTL_SECONDS` | Positive override for both, capped at 24 hours |
| Partial/failed loads | Retry on a later request after a cooldown of up to 60 seconds |
| Newly due round | Bypasses the normal cache lifetime |
| Stale fallback | Compatible last-good snapshot, explicitly labelled, for at most 24 hours |
| Retained snapshot versions | Up to three per season, each for at most 24 hours |

Refreshes are request-driven. Failed or regressed refreshes can retain the last
good bundle, with its original retrieval time; old results are not combined with
new standings. Missing-round coverage is recalculated, and standings that no
longer cover the latest due GP are withheld. Without usable cached evidence, a
failure is unavailable rather than a successful empty season.

Responses expose snapshot IDs, retrieval times, age, freshness, partial coverage
and retry information. Retrieval time is not provider publication time. A recent
fetch does not prove complete results or independently verified source data.

The UI loads a comparison and pins its prediction's current-season evidence to
that snapshot. Historical seasons have their own versions. Eviction, restart,
incompatible calendar changes or invalid IDs return HTTP 409 so the user can
request a new comparison; the server does not silently substitute a snapshot.

Run a single backend worker for the repository's default deployment. H2H snapshot
pinning across multiple workers or replicas requires sticky routing or a shared
snapshot store. In-memory snapshots do not survive process restarts.

## Forecast recording and evaluation

A local SQLite journal records the first pre-race forecast for each event,
unordered driver pair and model/rule/policy version, including abstentions.
Repeated or reversed comparisons do not overwrite it. Recording requires a
confirmed future start and rechecks the clock after data retrieval; late requests
cannot create retrospective forecasts.

Published outcomes are reconciled when fresh snapshots load or an operator
imports results. Pending, excluded and scored pairs remain distinct. Corrections
append outcome revisions without rewriting forecasts. Monitoring is available
through `GET /api/h2h/monitoring`; the H2H tab keeps score explanations and recording
status, while the aggregate monitoring panel is not displayed.

These records cover self-selected comparisons on this installation. Pair results
are correlated, and historical benchmarks are separate from prospective records.
Use persistent local storage for the journal across deployments; see the
monitoring guide for database configuration and imports.

## Detailed guides

- [Offline backtesting and input requirements](h2h-backtesting.md)
- [Candidate model evaluation and recorded results](h2h-model-evaluation.md)
- [Uncertainty policy and calibration audit](h2h-uncertainty.md)
- [Forecast monitoring, storage and operations](h2h-monitoring.md)
