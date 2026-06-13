# ChicaneAI - Project Context

## What It Is

AI-powered Formula 1 analytics and race prediction platform built by Apostolos Kakarantzas, IT student at Deree - The American College of Greece, specializing in Intelligent Systems & Automation.

## Stack

- Frontend: React + Tailwind CSS with Vite
- Backend: FastAPI with Python
- ML/data: scikit-learn models, pre-generated prediction data, and FastF1-powered H2H stats
- Data source: FastF1 plus fallback external F1 APIs inside the H2H backend logic
- Database: none currently; PostgreSQL is planned but not implemented
- Deployment status: ready for frontend deployment once backend hosting, CORS, and environment variables are configured

## Repo

github.com/akakarantzas/chicane-ai

## Project Structure

```text
chicane-ai/
+-- frontend/
|   +-- public/                  Static assets, fonts, logo, hero video
|   +-- src/
|       +-- App.jsx              useState-based page routing
|       +-- main.jsx             React entry point
|       +-- index.css            Global design, layout, animation, responsive CSS
|       +-- assets/circuits/     Circuit image assets
|       +-- components/
|       |   +-- AppNav.jsx
|       |   +-- AnimatedCircuit.jsx
|       |   +-- NextRaceCircuitCard.jsx
|       |   +-- ui/
|       +-- data/
|       |   +-- circuits.js
|       |   +-- drivers.js
|       |   +-- races.js
|       +-- hooks/
|       |   +-- useIsMobile.js
|       +-- lib/
|       |   +-- api.js           Backend API URL helper
|       +-- pages/
|           +-- Home.jsx
|           +-- Predictions.jsx
|           +-- H2H.jsx
|           +-- History.jsx
|           +-- Season.jsx
|           +-- Contact.jsx
+-- backend/
|   +-- app/
|       +-- main.py              FastAPI app, CORS, router registration
|       +-- data/
|       |   +-- drivers.py       Shared backend driver/team constants
|       +-- models/
|       |   +-- barcelona_catalunya_predictions.json
|       |   +-- barcelona_catalunya_metadata.json
|       |   +-- barcelona_catalunya_model.pkl
|       +-- routers/
|           +-- contact.py
|           +-- h2h.py
|           +-- predictions.py
+-- audit.md
+-- design.md
+-- README.md
+-- security_audit.md
```

## Current Navigation

Predictions - H2H - History - Calendar - Contact

Navigation is handled in `frontend/src/App.jsx` with local React state. There is no URL router or deep-linking yet.

## Current Site State

- Home: video hero, race countdown, next-race circuit card, scrollable 2026 race calendar, latest prediction preview, and season stats.
- Predictions: full next-race prediction table fetched from the backend, with animated probability bars and show-more behavior.
- H2H: driver selectors, driver comparison cards, FastF1-backed comparison results, and H2H prediction card.
- History: verified Miami 2026 prediction archive with actual winner comparison.
- Calendar: scrollable 2026 race calendar using shared frontend race data.
- Contact: contact form posting to the backend plus feature request chips.

## Prediction Data

Current prediction data is centered around the 2026 Barcelona-Catalunya Grand Prix.

- Model version: `barcelona-catalunya-hgb-calibrated-1.4`
- Status: Pre-Qualifying (`projected_grid`)
- P1: Antonelli, Mercedes, 28.3%
- P2: Norris, McLaren, 25.1%
- P3: Piastri, McLaren, 17.2%
- P4: Russell, Mercedes, 12.8%
- P5: Verstappen, Red Bull Racing, 5.0%

Frontend prediction views load from `GET /api/predictions/next-race`.
Backend API prediction data is served from `backend/app/models/barcelona_catalunya_predictions.json` with metadata from `backend/app/models/barcelona_catalunya_metadata.json`.
Training and export live in the standalone model repo: `f1-2026-barcelona-catalunya-grand-prix-winner-prediction`.

## Backend API Endpoints

- `GET /api/health` returns backend health status.
- `GET /api/predictions/next-race` returns the current prediction payload.
- `GET /api/h2h/compare?driver1=ANT&driver2=VER&year=2026` returns driver comparison stats.
- `GET /api/h2h/predict?driver1=ANT&driver2=VER` returns H2H winner prediction data.
- `POST /api/contact` accepts contact form submissions.

There is no `/api/races` endpoint anymore. Race calendar data is frontend-local in `frontend/src/data/races.js`.

## Configuration

Frontend backend URL:

- Local default: `http://localhost:8000`
- Deployment: set `VITE_API_BASE_URL` to the deployed backend URL.

Backend CORS:

- Configured in `backend/app/main.py`
- Local defaults: `http://localhost:5173`, `http://127.0.0.1:5173`
- Deployment: set `CORS_ORIGINS` to include the Vercel frontend domain.

Contact form:

- Requires `RESEND_API_KEY` and `CONTACT_EMAIL` in the backend environment.

## Design System Summary

- Background: `#0C0C0E`
- Card/surface: `#1A1A1F`, `#27272A`
- Accent red: `#E8002D`
- Primary text: `#F4F4F5`
- Muted text: `#A1A1AA`
- Buttons: 44px height, 8px radius
- Cards: mostly 8px radius in current implementation
- Content width: max 1280px, centered
- Mobile responsiveness: implemented with shared mobile nav and targeted responsive CSS

See `design.md` for the fuller design reference.

## What's Done

- All 6 current pages are implemented.
- Shared navbar and mobile menu are centralized in `AppNav.jsx`.
- Shared mobile breakpoint hook is centralized in `useIsMobile.js`.
- Frontend driver, race, and prediction constants are centralized under `frontend/src/data/`.
- Backend driver/team constants are centralized in `backend/app/data/drivers.py`.
- Unused races backend router was removed.
- Frontend API URL handling is centralized in `frontend/src/lib/api.js`.
- Mobile responsiveness pass was completed and the frontend build passed.
- Project documentation filenames are standardized to lowercase except `README.md`.

## What's Next

- Deploy backend to a reachable host.
- Deploy frontend through Vercel.
- Configure production backend URL and backend CORS.
- Add linting and basic smoke tests.
- Add CI/build checks.
- Add URL routing/deep-linking later if needed.
- Continue model improvements and post-race verification updates.

## Local Development

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Backend:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Frontend runs at `http://localhost:5173`.
Backend runs at `http://127.0.0.1:8000`.

## Save Progress

```powershell
git status
git add <files>
git commit -m "short descriptive message"
git push
```
