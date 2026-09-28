# Automatic prediction history

Future published forecasts are archived before race start. The backend checks
for released race results every 60 seconds while it is running; the History tab
also refreshes every 60 seconds while open and loads current history on entry.
No frontend race card needs to be added for each future Grand Prix. The existing
Miami, Barcelona-Catalunya and Azerbaijan cards remain as historical imports.

## Publishing a forecast

The prediction generator still needs to produce predictions and metadata. This
feature does not train models or automatically select a different artifact for
the Predictions endpoint, which currently serves the Azerbaijan pair.

Metadata requires `race`, `circuit` and `model_version`. Use a timezone-bearing
`generated_at`, such as `2026-10-02T10:00:00Z`, and an explicit `year` if generating
a forecast for a different calendar year. An optional ISO `race_date` is checked
against the calendar. `prediction_input.grid_source = qualifying_grid` identifies
a post-qualifying forecast. Race names must identify a unique calendar event.

Use the existing sync script, which now supports other artifact names:

```powershell
.\scripts\sync_azerbaijan_model.ps1 -SourceRepo .tmp-bahrain-model-repo -PredictionName bahrain
```

The source must contain `bahrain_predictions.json` and `bahrain_metadata.json`.
The script records the forecast before replacing artifacts and exports an
immutable manifest into `backend/app/models/forecast-archive/`. Commit those
manifest files along with the model artifacts so later deployments can restore
the original forecasts. They contain forecast data, timestamps and model metadata,
not personal information. They are different from the ignored runtime database.

For another publishing workflow, capture and export the pair before race start:

```powershell
cd backend
.\venv\Scripts\python.exe -m app.services.prediction_history capture --predictions app/models/bahrain_predictions.json --metadata app/models/bahrain_metadata.json --export-dir app/models/forecast-archive
```

The backend also discovers `*_predictions.json` / `*_metadata.json` pairs in
`backend/app/models/` every refresh and archives the original model values when
the prediction endpoint is called. Normalized display order follows probability;
no missing-driver placeholder probabilities are added to the archive. Use the
publishing command to preserve every update, including updates made faster than
the background interval. The sync script marks artifact replacement in progress
so the archive scanner skips a pair during publication.

Each distinct forecast is retained. Repeated reads do not create duplicates.
History shows one card per race, defaults to the newest forecast generated before
start, and offers a selector for earlier forecast updates. The original values
remain unchanged when actual outcomes arrive or the model changes.

## Published results

`GET /api/predictions/history` returns completed race cards, pending-result counts,
and refresh status. It shares the background refresh cooldown and forbids HTTP
caching. The frontend merges these cards with its existing historical imports,
orders them newest first, and keeps previous cards if a refresh fails.

Results use the existing paginated Jolpica feed. Match the original calendar date
and race identity; provider round numbers may differ from calendar round numbers.
For the known Las Vegas local-Saturday versus UTC-Sunday boundary, permit the
preceding local date only when the race identity and round also match and the
confirmed UTC start is before 08:00. Other date discrepancies stay pending.
Only query an archived race after its start. Require a complete-enough result
table covering the forecast's driver count, unique drivers and positions, and a
single winning position with `Finished` status and a completed race time. An empty
feed, grid, incomplete table or unmatched/rescheduled event stays pending.

The actual winner, classification and source link appear with the archived
prediction. Later published corrections update the result and winner check;
forecast values are immutable. Truncated refreshes and provider outages preserve
the last stored result. Provider release timing determines when the card can
appear, so completion alone does not promise an immediate card.

## Storage and deployment

Settings in `backend/.env`:

```dotenv
PREDICTION_HISTORY_ENABLED=true
PREDICTION_HISTORY_REFRESH_SECONDS=60
PREDICTION_HISTORY_DB_PATH=C:/chicane-data/prediction-history.sqlite
```

The default database is `backend/data/prediction-history.sqlite` and is ignored by
Git. Configure durable local storage outside OneDrive for local use, or a persistent
volume for deployed use. Publishing and serving must use the same archive database
or the exported forecast manifests must be included in the deployment. Manifests
can restore forecasts after storage loss; result classifications are fetched again.
Forecasts captured only in an ephemeral database cannot survive its deletion.

The worker starts with FastAPI and stops with the application. No operating-system
scheduler is required. Pausing/stopping the backend pauses result checks; the next
startup or History request checks again. Concurrent writes deduplicate in SQLite.
For multiple instances, distribute the published manifests to each instance and
use local persistent storage; this is not a shared cloud database.

Fresh captures require a confirmed future start and re-check server time after
calendar retrieval. Artifacts first encountered after start are never backfilled
as forecasts. The private manifest importer accepts a previously recorded forecast
only when its recorded time precedes start and its content hash agrees. These
operator-controlled files are not a cryptographic attestation, and there is no
public API for submitting forecasts, timestamps or results. The three historical
imports are not relabeled as records captured by this new service.

## Validation

Focused tests cover preservation and deduplication of updates, race-start boundaries,
slow schedule lookups, absent and invalid classifications, later published results,
corrections and outages, unattended scanning, manifest export/import, API capture,
frontend polling and cleanup, forecast selection, and retention during refresh
failure. They use temporary archives and synthetic race fixtures; no future
forecast or result is fabricated in the installation's real history.

Final validation on September 28, 2026: 347 backend tests, 43 frontend tests,
and the production frontend build passed. The running History endpoint returned
HTTP 200 with the expected response and `Cache-Control: no-store`. Visual browser
verification was unavailable. Existing backend dependency deprecation warnings remain.
