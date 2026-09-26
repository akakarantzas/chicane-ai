# H2H accuracy rollout

Each step is validated and committed before the next begins. Commits stay local
unless a push is requested. Model improvements require measured out-of-time
results; no target accuracy or probability calibration is assumed in advance.

| Step | Scope | Lowercase commit message |
| --- | --- | --- |
| 1 | Define and enforce the prediction target | `fix: enforce h2h finish-ahead scoring rules` |
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

## Step 2: dynamic race discovery

Implemented `h2h_schedule.py` to fetch the supported season calendars from
FastF1, with Jolpica as a fallback. Race names and next-race selection are no
longer hardcoded. The supported seasons remain 2024–2026 because this app's
roster and season overview are explicitly for 2026; calendar discovery does
not automatically migrate the driver roster to a new year.

- Select the Grand Prix race session, including on sprint weekends, and ignore
  testing and explicitly cancelled entries. The provider calendar supplies
  the event dates and round numbering.
- Use UTC start times. Missing times remain unconfirmed: on a date-only race
  day, do not invent a start time or skip directly to a later race.
- Consider a timed event due for result lookup four hours after its start;
  for date-only events, wait until the following UTC day. This conservative
  delay is a publication buffer, not evidence that the race finished.
- Require a published winner with a finishing status from FastF1/Jolpica.
  OpenF1 must also supply an ended session and a winner not marked DNF/DNS/DSQ.
  Future races, running sessions, and grid-only timing tables are excluded.
- Match external results to unambiguous calendar dates and retain round/date
  metadata. Verify FastF1's selected session date too, because calendar
  providers can differ in numbering after schedule changes. General source
  identity reconciliation and deduplication remain step 3.
- Follow all Jolpica result pages using `offset`; its maximum page size is
  100 driver results. Reassemble races split between pages before validating
  their winner. Reject empty intermediate pages or repeated offsets.
- Cache calendars for 30 minutes, retry failures, and return a clear 502 when
  both calendars fail. A known calendar with no future starts returns
  `no_upcoming_race`, with no predicted winner.
- Return expected/loaded/missing rounds in the API. The season overview warns
  about missing races. `all_due_rounds_present` means every due round has
  result rows, not that every driver, points total, or source is reconciled.
- Continue trying fallback result sources for partial historical seasons too.

The existing six-hour results cache is unchanged. Coverage is computed against
the calendar and the actual returned cached rows, so newly due rounds can be
reported missing until results refresh. More timely shared snapshots and
freshness handling remain step 6. An outdated upstream calendar cannot be
proven current simply because its HTTP request succeeded.

Validation on September 25, 2026: 113 backend tests, 8 frontend tests, and the
frontend production build passed. A live source check discovered Azerbaijan
as the next Grand Prix on September 26 at 11:00 UTC. The paginated Jolpica
loader returned 308 results across 14 completed races, through the Spanish
Grand Prix, with no due rounds missing. Previously, requesting `limit=1000`
still returned only 100 results and truncated the season during Canada.

Additional references:
- [Jolpica pagination and user-agent requirements](https://github.com/jolpica/jolpica-f1/blob/main/docs/README.md)
- [Jolpica race calendar fields](https://github.com/jolpica/jolpica-f1/blob/main/docs/endpoints/races.md)

## Step 3: canonical identities and source reconciliation

Both H2H endpoints now consume reconciled results before caching or calculating
statistics. A result is identified by calendar season, round, Grand Prix session,
and driver identity, not the provider's race display name. Calendar names/dates
are retained alongside the selected provider's original race label.

- Prefer Jolpica's published classifications/points, then FastF1, then OpenF1.
  This is a deterministic application policy, not a guarantee that the preferred
  provider is always the freshest. Lower-priority providers fill absent driver
  rows, not individual classification fields. Status, position and points stay
  together so a fallback cannot resurrect a disqualified or missing result.
- Preserve Jolpica/FastF1 driver IDs. Link code-only rows only through an
  unambiguous source-supplied driver code. When no provider ID exists, explicitly
  label the fallback identity `code:XXX` and its basis `driver_code`; do not
  pretend it is a verified provider identity. This relies on driver codes being
  stable within the supported seasons; future code changes need explicit aliases.
- Remove current-roster car-number matching from historical results. OpenF1
  numbers resolve only through its session's driver list; missing or ambiguous
  identities are skipped. Jolpica retains the actual race number before the
  permanent number, and neither adapter fabricates historical teams from 2026.
- Reject out-of-calendar, mismatched-date, invalid-code and non-race rows.
  Collapse repeated pages/results. Output order and source choice do not depend
  on loading order. Pairwise records use calendar rounds rather than race labels.
- Keep selected source, contributing sources, conflict sources, canonical IDs
  and identity basis in cached rows. Quarantine ambiguous identities and
  conflicting outcomes within the highest-priority source, with server warnings,
  instead of choosing an arbitrary duplicate or reviving a lower-source result.
- OpenF1's unavailable points are marked `points_available: false` and do not
  create false points-conflict reports. The existing zero-valued fallback in
  displayed totals is deliberately not fixed here: missing-point presentation,
  sprint points, standings and broader statistical correctness remain step 4.

Coverage still measures rounds with any returned rows, not full driver coverage.
Row-level provenance is internal for now; shared freshness and API diagnostics
remain step 6. Model accuracy and calibration remain unmeasured until steps 7-9.

Validation: 139 backend tests passed, including cross-source duplicates,
input-order independence, source fallback, identity ambiguity, historical
number reuse, disqualification preservation and both API integration paths.
All 8 frontend tests also passed; no frontend code changed in this step.

## Step 4: season statistics and championship standings

The season comparison no longer ranks drivers using a sum of Grand Prix-only
points. `points` and `champ_position` now come exclusively from a validated
Jolpica driver-standings table. This retains published sprint points, adjustments
and tie-break positions without mixing sprints into the finish-ahead history.
The API identifies the source and the calendar event/date the standings cover.

- Resolve the provider's reported round by its race date, including when its
  numbering differs from the calendar. Require the latest due GP, the requested
  season, a complete table, valid points/ranks and unambiguous driver identities.
  Older standings are marked `stale`; future, malformed, truncated or unavailable
  tables cannot supply current championship values. Excluded championship
  drivers retain a null rank rather than an invented position.
- Do not locally recalculate championship tie-breaks or estimate missing totals.
  Standings are fetched per comparison for now; result-cache synchronization and
  shared snapshots remain step 6. The displayed scope is through a published GP,
  not a promise of live standings during the next sprint/race weekend.
- Keep the loaded GP-only points subtotal separately as `gp_points`. Missing,
  invalid, nonfinite or OpenF1-unavailable points are null, not zero. A subtotal
  with any unknown component is null too; genuine published zero remains zero.
- Apply the finish-ahead eligibility contract to GP wins, podiums, best finish
  and average finish. Retirements with eligible final positions count; DNS,
  DSQ and explicitly unclassified results do not. Sprints never enter these
  metrics. Report the eligible finish sample size and excluded-entry count.
- Rename the UI count to **GP Result Entries**: it counts loaded result rows,
  including non-start entries, not races completed or verified starts. GP
  metrics explicitly describe loaded evidence, not guaranteed complete season
  totals. Missing positions leave win/podium counts unknown; best/average finish
  use the available eligible sample and a partial-data warning.
- No rows for a driver means unknown GP metrics, not zero achievements. Valid
  standings can still supply points/rank when GP results fail. A standings/GP
  driver-ID conflict withholds that driver's championship values. Keep other
  seasons out of the season comparison, and do not invent historical team/number
  metadata for missing results.
- UI labels distinguish championship points from GP-only metrics and show
  unavailable values as dashes, with source-scope and failure explanations.

Read-only live checks on September 26, 2026 successfully loaded the complete
2025 table (21 drivers, through Abu Dhabi) and the current 2026 table (23 drivers,
through Azerbaijan). This verifies provider compatibility, not model accuracy
or independent auditing of every upstream result.

Validation: 185 backend tests, 12 frontend tests and the frontend production
build passed. Tests cover published totals/tie-breaks, sprint separation,
missing/zero values, stale and malformed standings, eligibility rules, identity
conflicts, source failures, season isolation and UI unavailable states.

Reference: [Jolpica driver standings fields and round scope](https://github.com/jolpica/jolpica-f1/blob/main/docs/endpoints/driverStandings.md).

## Step 5: chronological history and recent form

Recent form now means each driver's last three **available eligible Grand Prix
results**, ordered oldest to newest before taking the window, rather than the
last three rows returned by a source. The window still uses a simple average;
this step does not tune weights or claim measured predictive improvement.

- Prefer calendar race dates. When dates are missing, use numeric calendar
  rounds for the entire affected season, only if every round is known and no
  supplied date is invalid or contradicts its year. Different seasons may use
  different known bases, but dates and round numbers are never mixed as sorting
  values within one season. No name-based or insertion-order chronology guesses.
- Apply the finish-ahead eligibility rules before selecting the recent window.
  Retirements with eligible final positions count; DNS, DSQ, explicitly
  unclassified results, missing/invalid positions and sprints do not.
- Windows are per driver, not restricted to shared races. They may cross season
  and team boundaries. Keep each contributing race's year, round, date, position
  and historical team; report the sample size, ordering basis and cross-season
  flag. Fewer than three eligible results stay a smaller sample, without padding.
  Missing source races can still leave an incomplete window; shared freshness
  and per-driver coverage diagnostics remain step 6.
- The prediction endpoint passes its target event into the history builder.
  Exclude target-event rows, same-date/later results and rows that cannot be
  established as earlier. Legacy rows without dates require known season/round
  ordering. This boundary applies to averages, H2H, form and selected metadata,
  not just the form window. Report the target and excluded-row count.
- Select latest driver/team metadata chronologically, including valid GP entry
  metadata from excluded finishes, rather than selecting the last loaded row.
  Unknown chronology does not pick an arbitrary historical team. H2H record
  details also follow chronological order where it can be established.
- If an eligible history cannot be ordered reliably, recent form is null. When
  either driver lacks form, omit that component and renormalize the existing
  remaining heuristic contributions; do not substitute a guessed or neutral
  result. Otherwise retain the existing weights. API evidence and the prediction
  card explain which windows were used and whether form contributed to the score.

This is an event-time boundary, not a full point-in-time backtest: later provider
corrections to older results are still possible. No decay, team/circuit weighting,
minimum-sample confidence rule or new model is introduced without the evaluation
and uncertainty work planned in steps 7-9.

Validation: 211 backend tests, 14 frontend tests and the frontend production
build passed. Added checks cover shuffled loading order, rescheduled-date order,
numeric-round fallback, mixed date availability, cross-season and sparse windows,
eligibility, latest-team metadata, driver-swap symmetry, target/future exclusion,
unknown chronology, API window evidence and the UI's sample explanations.

## Validation gates

- Step 1: edge-case rule tests, adapter flag tests, API metadata tests, UI empty/tied state tests, and frontend build.
- Steps 2–3: completed-only events, missing-round detection, one result per driver/session, and deterministic source precedence.
- Steps 4–6: reconcile published totals, chronological history, shared snapshots, and tested stale/failure behavior.
- Steps 7–9: all pairings of each race remain in one split; features and calibration use only earlier information; retain the baseline unless candidates improve held-out results.
- Step 10: record predictions before races and evaluate after results; explanations match the returned evidence.
