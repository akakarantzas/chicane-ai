# ChicaneAI project context

ChicaneAI is a Formula 1 analytics app with race-winner forecasts, driver
head-to-head comparisons, prediction history and a season calendar.

This document describes the architecture. Use the [README](../README.md) for
local setup and the feature guides below for operational details.

## Application structure

| Area | Implementation |
| --- | --- |
| Frontend | React, Tailwind CSS and Vite in `frontend/` |
| Navigation | Local React state in `frontend/src/App.jsx`; no URL routing or deep links |
| API | FastAPI in `backend/app/main.py` |
| Race-winner forecasts | Exported scikit-learn model and JSON artifacts in `backend/app/models/` |
| H2H | Historical finish-ahead heuristic with reconciled results and published standings |
| Persistent records | Local SQLite journals for forecast history and H2H monitoring |
| Automatic qualifying updates | Background inference with updates stored as atomic JSON documents |
| CI | GitHub Actions runs backend tests, frontend tests, the frontend build and a dependency audit |

The pages are Home, Predictions, H2H, History, Calendar and Contact. Shared
navigation lives in `frontend/src/components/AppNav.jsx`; API URL construction
lives in `frontend/src/lib/api.js`.

## Race-winner predictions

Home and Predictions fetch `GET /api/predictions/next-race` through the shared
`usePredictionFeed` hook. They refresh every 60 seconds and retain the last
successful forecast if a later refresh fails.

The active model artifacts are for Singapore. Training and export belong to the
separate [Singapore model repository](https://github.com/akakarantzas/f1-2026-singapore-grand-prix-winner-prediction).
The app serves the published baseline JSON or its matching post-qualifying update.
API request handlers do not train or load the model.

While the backend is running, a worker checks official Grand Prix qualifying
completion and the full classification. It substitutes qualifying positions into
frozen pre-race features, runs the saved model and archives both forecast stages
before publishing the update. Qualifying order can differ from the final starting
grid after penalties. New forecasts are not generated after race start.

The current forecast's version, stage, probabilities and generation time belong
in its API payload and artifact metadata, rather than being duplicated here.
See [Singapore artifact publication](singapore-predictions.md) and
[automatic post-qualifying updates](post-qualifying-predictions.md).

## H2H comparisons

H2H predicts which selected driver finishes ahead in the next Grand Prix. It uses
a separate heuristic from the full-field race-winner model. Its raw scores are
uncalibrated; the interface shows evidence and can withhold a favorite when that
evidence is insufficient.

Calendars come from FastF1 with a Jolpica fallback. Result reconciliation uses
Jolpica, FastF1 and OpenF1; championship values come from published standings.
Comparison and prediction share process-local snapshots, and the UI pins its
prediction to the comparison's current-season data version.

The first eligible pre-race comparison is recorded in a SQLite journal, including
abstentions. The H2H tab shows score explanations and recording status. Aggregate
monitoring remains available through the API; its panel is not displayed in the tab.

See the [H2H technical reference](h2h.md) for scoring, coverage, caching and
deployment requirements, and [monitoring operations](h2h-monitoring.md) for storage.

## History and calendars

History combines the existing Miami, Barcelona-Catalunya and Azerbaijan records
with archived forecasts and published outcomes from `GET /api/predictions/history`.
It refreshes automatically and supports selecting recorded forecast versions.
The backend history worker archives published forecasts and checks for results;
it is separate from the H2H monitoring journal.

The Home and Calendar views use the frontend-local 2026 schedule in
`frontend/src/data/races.js`. H2H and prediction-history services use provider
calendars. Updating the frontend schedule does not change the backend's target
discovery. Circuit images, paths and animation settings are maintained in
`frontend/src/assets/circuits/`, `frontend/src/data/circuits.js` and the shared
circuit components.

See [prediction-history operations](prediction-history.md) for archival rules,
result reconciliation and storage recovery.

## API surface

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Backend health check |
| `GET /api/predictions/next-race` | Active race-winner forecast and metadata |
| `GET /api/predictions/history` | Recorded forecasts and available race outcomes |
| `GET /api/h2h/compare` | Selected drivers' season statistics and snapshot information |
| `GET /api/h2h/predict` | Finish-ahead prediction, evidence and recording status |
| `GET /api/h2h/monitoring` | Read-only summary of recorded H2H forecasts and outcomes |
| `POST /api/contact` | Contact-form submission through Resend |

FastAPI's `/docs` page describes request parameters and response schemas.

## Configuration and persistence

- Set `VITE_API_BASE_URL` in the frontend build environment for the backend URL.
  Its local default is `http://localhost:8000`.
- Use [backend/.env.example](../backend/.env.example) for backend configuration.
  `CORS_ORIGINS` permits frontend origins; `RESEND_API_KEY` and `CONTACT_EMAIL`
  configure contact delivery.
- Forecast history defaults to `backend/data/prediction-history.sqlite` and H2H
  monitoring to `backend/data/h2h-monitor.sqlite`. The paths can be set with
  `PREDICTION_HISTORY_DB_PATH` and `H2H_MONITOR_DB_PATH`.
- Post-qualifying publications default to `backend/data/prediction-updates/`,
  configurable with `PREDICTION_UPDATES_DIR`.
- Preserve these stores on durable local disk or a persistent deployment volume.
  They are ignored by Git. H2H snapshots are in memory and disappear on restart.
- Automatic qualifying inference requires both `POST_QUALIFYING_ENABLED` and
  `PREDICTION_HISTORY_ENABLED`. Background workers run with the FastAPI process.
  The current file-based publisher is intended for a single backend worker.

## Development and verification

Backend services and regression tests live in `backend/app/services/` and
`backend/tests/`. Frontend tests use Vitest and React Testing Library alongside
the source files. CI configuration is in
[.github/workflows/ci.yml](../.github/workflows/ci.yml); it uses Python 3.12 and
Node.js 22.

For related details, see the [design reference](design.md),
[H2H backtesting guide](h2h-backtesting.md),
[H2H model evaluation](h2h-model-evaluation.md) and
[H2H uncertainty policy](h2h-uncertainty.md).
