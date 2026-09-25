# H2H accuracy rollout

Each step is validated and committed before the next begins. Commits stay local
unless a push is requested. Model improvements require measured out-of-time
results; no target accuracy or probability calibration is assumed in advance.

| Step | Scope | Lowercase commit message |
| --- | --- | --- |
| 1 | Define and enforce the prediction target | `fix: define h2h finish ahead rules` |
| 2 | Discover completed events and the next race | `fix: discover h2h races dynamically` |
| 3 | Normalize event identities and reconcile sources | `fix: deduplicate h2h results across sources` |
| 4 | Correct statistics and championship standings | `fix: reconcile h2h season statistics` |
| 5 | Order history and evaluate recent form | `fix: order h2h history chronologically` |
| 6 | Shared data snapshots and freshness reporting | `feat: track h2h data freshness and coverage` |
| 7 | Chronological evaluation and baseline comparisons | `feat: add race grouped h2h backtesting` |
| 8 | Evaluate candidate prediction models | `feat: evaluate h2h prediction models` |
| 9 | Validate probabilities and handle insufficient evidence | `fix: report h2h prediction uncertainty honestly` |
| 10 | Explain predictions and track future outcomes | `feat: explain and monitor h2h predictions` |

## Step 1: finish-ahead contract

Target: **which of the two selected drivers finishes ahead in the next Grand
Prix**, not which driver wins the race. API identifier: `finish_ahead`.
Rule version: `finish-ahead-v1`. These are product comparison rules, not a
betting settlement policy. They describe how available final results are
scored; later steps must validate data completeness and finality.

| Situation | Treatment |
| --- | --- |
| Both drivers have valid final positions | Lower position wins the pairwise comparison. |
| One or both retire | Use their published final positions if available and otherwise eligible; do not infer positions from laps or retirement order. |
| Either does not start, qualify, or is withdrawn | Exclude the pair. A non-start is not an automatic loss. Zero laps alone does not prove a non-start. |
| Either is disqualified or excluded | Exclude the pair, even if a provider supplies a numeric position. |
| Either is explicitly marked not classified | Exclude the pair. |
| Either has no valid final position or no result row | Exclude the pair; do not fill in a last-place result. |
| Positions are equal | Record separately, with neither driver awarded a win. |
| Sprint, qualifying, or practice | Exclude from the Grand Prix H2H record and prediction history. |

Positions must be finite positive integers. Zero, negative values, fractions,
booleans, NaN, infinity, and nonnumeric provider markers are invalid. A retired
driver with a published numerical final order remains eligible unless the
source explicitly marks them unclassified; retirement is not itself a synonym
for unclassified. Existing rows without session metadata are race-only legacy
rows. Missing status metadata is not fabricated.

The historical record exposes scored, equal-position, and excluded counts.
An excluded count covers race groups where at least one selected driver appears;
it is not a season-completeness metric. Data for unrelated drivers cannot inflate it.
Swapping the selected drivers must swap their wins without changing eligibility.

The **season overview** covers the requested season. The **prediction history**
may span multiple seasons; the API and prediction card identify those years
separately. An empty history for either driver returns `insufficient_data` and
no predicted winner. Equal model scores return `no_clear_favorite`, not an
arbitrary win for the first driver. Scores remain heuristic until steps 7–9.

Source adapters retain status/classification flags from FastF1, Jolpica and
OpenF1 so the same eligibility rules can be applied after loading. This step
does not claim to resolve missing rounds, duplicate names, stale caches,
standings, or historical evaluation; those are the subsequent milestones.

Provider references:
- [Jolpica results fields](https://github.com/jolpica/jolpica-f1/blob/main/docs/endpoints/results.md)
- [OpenF1 session results](https://openf1.org/docs/#session-result)

## Validation gates

- Step 1: edge-case rule tests, adapter flag tests, API metadata tests, UI empty/tied state tests, and frontend build.
- Steps 2–3: completed-only events, missing-round detection, one result per driver/session, and deterministic source precedence.
- Steps 4–6: reconcile published totals, chronological history, shared snapshots, and tested stale/failure behavior.
- Steps 7–9: all pairings of each race remain in one split; features and calibration use only earlier information; retain the baseline unless candidates improve held-out results.
- Step 10: record predictions before races and evaluate after results; explanations match the returned evidence.
