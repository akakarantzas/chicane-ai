# H2H target and result coverage

## Step 1: diagnosis completed September 28, 2026

Reported symptom: the H2H season overview displayed
`Results are incomplete. Missing races: Azerbaijan Grand Prix.`
The user understood Azerbaijan to be the upcoming prediction target.

Read-only calendar and API checks found:

- The local clock was September 28, 2026, approximately 09:06 UTC.
- The live FastF1 calendar placed Azerbaijan on September 26 at 11:00 UTC,
  round 15. Formula 1's [race page](https://www.formula1.com/en/racing/2026/azerbaijan)
  also listed September 26 and published race results.
- The backend selected Bahrain on October 4 at 07:00 UTC, round 16, as its
  next event. This was the calendar returned during diagnosis; future schedule
  changes must continue to come from the calendar provider.
- The paginated Jolpica feed returned 22 Azerbaijan driver results. The H2H
  Jolpica adapter retained them and reported all 15 due rounds present.
- A request to the running local `/api/h2h/compare` endpoint at approximately
  09:07 UTC returned `all_due_rounds_present`, empty `missing_rounds` and
  `missing_races`, a fresh snapshot, and standings through Azerbaijan.
- The Predictions endpoint separately serves saved Azerbaijan artifacts
  generated September 22. That forecast title does not determine H2H's target.

The reported warning did not reproduce with the current comparison response.
The original response and its retrieval time were not captured, so an earlier
provider delay, an older snapshot, or an unchanged page cannot be distinguished
from this check alone. No server clock, schedule dates, provider results, or
prediction weights were changed. No prospective forecast was recorded by these
checks.

### Follow-up: two calendars disagreed (November 10, 2026)

The frontend did not use this calendar. `frontend/src/data/races.js` was
maintained by hand and still listed Bahrain on April 12 and Saudi Arabia on
April 19, so every later round number was off by two (Azerbaijan was round 17,
not 15). On September 28 the home page therefore named Singapore as the race
after Azerbaijan, while H2H targeted Bahrain on October 4. That disagreement
between two "next races" is the most likely source of the confusion. It was
fixed by `fix: match the frontend race calendar to the published 2026 schedule`,
which drops the Saudi round and moves Bahrain to October 4 as round 16.

### Relevant existing behavior

- `RaceEvent.results_due` considers results due four hours after a confirmed
  start, or the following day when only a race date is known. This determines
  which published results to seek; it does not prove results are available.
- `race_coverage` checks all due season rounds. The reported text comes from
  that season overview, not directly from the prediction scorer.
- `next_race` selects a start later than the server time. A race selected by
  this function cannot simultaneously be due under the confirmed-time rule
  when both checks use the same calendar and time.
- `before_target` already excludes the target's identity and results dated on
  or after its race date from the scorer.
- Missing due current-season results can withhold a favorite. This safeguard
  should not be removed to disguise a completed race as an upcoming one.

## Remaining steps

2. Add focused regression coverage for an upcoming Azerbaijan race, an earlier
   missing race, the same calendar after Azerbaijan, and requests crossing race
   start. Verify both coverage boundaries and exclusion of target outcomes from
   scoring. Run the affected backend and frontend checks.
   Suggested commit: `test: cover h2h target and result coverage boundaries`.

3. Display the actual H2H target and the latest race used by its history. Explain
   genuine missing earlier results with race dates so users can distinguish a
   season coverage warning from the event being predicted. Resolve the target
   from the H2H calendar and response rather than the saved full-grid forecast.
   Suggested commit: `fix: clarify h2h prediction target and history`.

4. Only if a step 2 test fails: make prediction coverage explicitly use the same
   pre-target boundary as scoring. Today coverage counts only rounds whose
   results are due, and `next_race` only selects a race that starts after the
   server time, so the target cannot be due (see "Relevant existing behavior").
   Without a failing test this step would add a second coverage path for no
   behavior change. If it is needed, preserve separate coverage for the season
   overview and the pinned data snapshot, never require target or later results,
   and keep missing earlier due rounds visible.
   Suggested commit: `fix: align h2h prediction coverage with its target`.

Generating an Azerbaijan forecast after its start would require a separate,
explicit historical replay mode with pre-race input and availability cutoffs.
Such a mode is outside this live upcoming-race repair.
