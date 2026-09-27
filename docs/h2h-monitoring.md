# Step 10: explanations and prospective monitoring

## Score explanations

The prediction API returns `model_version: h2h-heuristic-v1` and an `explanation`
in selected-driver order. Each component includes its input values, availability,
effective normalized weight, and contribution to each raw score. Contributions
sum to the existing score before rounding; this change does not alter model weights.

Shared H2H, average finish and recent form normally use weights 0.4/0.3/0.3.
Without shared races they use 0/0.5/0.5. Unknown form is omitted and remaining
weights are normalized. Missing average evidence is explicitly a neutral fallback,
not fabricated data. These are arithmetic explanations, not causal effects,
probabilities, or guarantees about what will happen. Step-9 safeguards can still
withhold a favorite. The UI exposes the breakdown for available and abstained
comparisons alike.

## Persistent first-pre-race journal

After a prediction finishes computing, the backend records it only if the target
has a confirmed future start time. It checks the server time again after fetching
data; requests that cross the start boundary are not backfilled as pre-race.
There are no client-supplied prediction timestamps or public mutation endpoints.

The first request for an unordered driver pair, canonical event, model version,
finish-ahead rule version and evidence-policy version wins. Reversed selections
and repeated/concurrent requests share the same record. Abstentions are recorded
too. Later comparisons may show new data, but do not overwrite the first forecast;
the response/UI states when the current comparison differs from the saved record.

Each saved record contains the server timestamp, target schedule, selected driver
order, complete prediction (including explanation, evidence and snapshot metadata),
version identifiers, relevant pre-target input rows and hashes. No IP addresses,
request headers, user accounts or other personal identifiers are collected.
Database triggers reject forecast updates/deletes and outcome updates/deletes.
This is application-level immutability, not a cryptographic attestation: a database
owner can still replace files or modify the schema.

`monitoring` in the prediction response distinguishes `recorded`, `already_recorded`,
`disabled`, `not_recorded` and `unavailable`. A storage failure is logged and
reported without breaking the prediction. Do not interpret an unavailable/disabled
journal as successfully recording a forecast.

## Published outcomes and corrections

Prediction requests also attempt to reconcile saved forecasts with already-loaded,
fresh result snapshots. They make no additional provider calls for monitoring.
Stale snapshots do not settle outcomes. A separate operator command can import
frozen reconciled published results, including after the season ends:

```powershell
cd backend
.\venv\Scripts\python.exe -m app.services.h2h_monitor summary
.\venv\Scripts\python.exe -m app.services.h2h_monitor settle --input evaluation/published-results.json
```

Both commands accept `--db PATH`. Import accepts a JSON result array or the
`h2h_dataset` exporter envelope. For an envelope, `provenance.completed_at` is the
observation timestamp. Bare arrays are a trusted operator assertion of current
results and use import time; prefer timestamped exports to avoid importing stale
evidence. Only the local operator CLI can import; the public API cannot submit
arbitrary classifications.

Require the target's original event/date match, a published finishing winner, both
driver rows and at least the existing four-hour publication buffer after race
start. Unconfirmed/rescheduled dates, absent entries, missing positions and
incomplete timing tables remain unresolved, not losses. DNS, DSQ, explicit
unclassified entries and equal positions are exclusions, not incorrect predictions.
Retirements follow the existing final-position contract. No timestamps alone prove
finality; these are published classifications subject to correction.

Outcome evidence is append-only. Later corrections produce new revisions, including
a correction back to an earlier result. Reports use the latest accepted revision
without editing the original prediction. Per-forecast observation watermarks also
advance when a newer snapshot confirms the same outcome, so an older snapshot
cannot then roll it back. Incomplete refreshes preserve previously published
outcomes. Source retrieval/import times are not official publication times, and
unknown upstream caching/corrections cannot be independently certified here.

No scheduler is installed. Outcomes refresh on prediction requests or explicit
operator imports, not continuously. Cancelled/rescheduled events and absent
classifications may stay pending; inspect them rather than inventing outcomes.
Unsupported archived rule versions remain unresolved rather than being re-scored
under different rules. Bump the model/evidence/rule identifiers when changing their
semantics; historical rule implementations are needed before reconciling older
rules after a future rule migration.

## Read-only monitoring and interpretation

`GET /api/h2h/monitoring` reads aggregate records without contacting providers,
recording a forecast or creating a missing database. The UI fetches it only when
the user clicks **Show prediction monitoring** or refreshes it.

Keep each model/rule/policy combination separate. Report:

- Logged, pending, excluded and eligible pair counts.
- Abstentions divided by all logged forecasts, including pending/excluded entries.
- Decision coverage among eligible published outcomes.
- Accuracy among decided eligible outcomes only; null if none, never fabricated 0%.
- Race-average accuracy, weighting each race with a decided outcome equally.
- Per-race results and the latest five versus previous five scored-race accuracies,
  only after at least ten such races. This is a descriptive trend, not an alert
  threshold, independent-pair confidence interval or significance test.
- Accepted result-evidence revisions and latest recorded outcome time.

This measures **first forecasts requested on this installation**, not every
possible driver pair. Request choices/timing are self-selected, and pairs and
races are correlated. Never pool model versions, compare different coverage as if
identical, or interpret these metrics as probability calibration. Step-8 historical
backtests are not imported as prospective records; real monitoring begins with
future requests. No measured future accuracy is claimed before races occur.

## Storage and deployment

`H2H_MONITOR_ENABLED=true` by default; set it to `false` to disable recording and
the public summary. `H2H_MONITOR_DB_PATH` selects the SQLite file; the default is
`backend/data/h2h-monitor.sqlite`, created on the first eligible record and ignored
by Git along with its journal files. The operator CLI explicitly acts on the
chosen database even when web recording is disabled.

Use a durable local disk and back up the database while the backend is stopped
or with SQLite's supported backup facilities. Do not run the live database on
OneDrive, other cloud-sync folders or network filesystems. This repository lives
in OneDrive, so configure `H2H_MONITOR_DB_PATH` outside that folder for durable
deployment. Do not commit the database or generated evaluation files.

SQLite serializes writes and survives process restarts on the same storage.
This is not a shared multi-replica/cloud database. Ephemeral deployments lose the
journal unless a persistent volume is configured. The existing snapshot pinning
still requires the documented single-worker/sticky-routing setup. No external
database provisioning, scheduled job, deployment, historical backfill, retention
deletion or remote service was performed in this step.

## Validation

Tests cover score reconstruction and driver symmetry, immutable/repeated/concurrent
records, exact start-time boundaries and slow requests, saved input cutoffs,
pending/excluded/abstained outcomes, revisions, old-observation rollback protection,
version separation, race-macro versus pair weighting, trend sample requirements,
storage failures, API/CLI behavior, and UI empty/error/evidence states. Automated
tests use temporary databases, never the installation's journal.

Visual browser verification was unavailable in this session. No live prospective
forecasts or actual future outcomes were fabricated for validation.

Final validation: 327 backend tests, 38 frontend tests and the production build
passed. The two pre-existing backend dependency deprecation warnings remain.
