# Chicane.ai — Codebase Audit

_Generated 2026-04-22. Read-only audit; no code was modified._

---

## 1. Tech Stack

### Frontend

| Item | Version |
|------|---------|
| React | 18.3.1 (`^18.3.1` in package.json) |
| React DOM | 18.3.1 |
| Vite | 6.0.1 |
| @vitejs/plugin-react | 4.3.1 |
| Tailwind CSS | 3.4.14 |
| PostCSS | 8.4.47 |
| Autoprefixer | 10.4.20 |
| Language | JavaScript (JSX); no TypeScript |
| Routing | Custom `useState`-based router in `App.jsx`; no react-router or equivalent |
| External CDN | Google Fonts (DM Sans 600) loaded at runtime from `fonts.googleapis.com` |

### Backend

| Item | Installed Version | requirements.txt Pin |
|------|------------------|----------------------|
| Python | 3.14 (CPython, inferred from `__pycache__/*.cpython-314.pyc`) | N/A |
| FastAPI | 0.135.3 | unpinned |
| Uvicorn (standard) | 0.44.0 | unpinned |
| FastF1 | 3.8.2 | unpinned |
| pandas | 2.3.3 | unpinned |
| joblib | 1.5.3 | unpinned |
| python-dotenv | unknown (not resolvable via pip show in this session) | unpinned |

Note: Python 3.14 is a pre-release / bleeding-edge CPython version as of this audit date.

### ML

| Item | Details |
|------|---------|
| Race prediction model | `rf_model.pkl` — serialized model loaded via `joblib` in `backend/app/models/predict.py`; described in comments as a Random Forest trained on Monaco features, but CONTEXT.md references a separate "Gradient Boosting" model for Miami. The Miami predictions are served from a **pre-generated JSON file**, not by calling the model at request time. |
| H2H prediction | Rule-based scoring model implemented directly in `backend/app/routers/h2h.py` (no persisted model file); weighted composite of H2H win rate (0.4), average finish (0.3), recent form (0.3). |

---

## 2. Directory Structure

```
chicane-ai/
├── backend/                    FastAPI server + ML artifacts
│   ├── .env.example            Single-key stub (APP_ENV=development)
│   ├── requirements.txt        Python deps (all unpinned)
│   └── app/
│       ├── main.py             FastAPI app instantiation, CORS config, router registration
│       ├── routers/
│       │   ├── predictions.py  GET /api/predictions/next-race — reads miami_predictions.json
│       │   ├── races.py        GET /api/races/ — stub returning empty list
│       │   └── h2h.py          GET /api/h2h/compare and /predict — FastF1 + external APIs
│       ├── models/
│       │   ├── rf_model.pkl    Serialized sklearn model (joblib)
│       │   ├── predict.py      Model inference wrapper (currently unused by any router)
│       │   └── miami_predictions.json  Pre-generated race win probabilities (22 drivers)
│       └── data/               Empty (placeholder .gitkeep)
├── cache/
│   └── fastf1_http_cache.sqlite  FastF1 HTTP response cache (~grows over time)
├── frontend/
│   ├── index.html              HTML shell; loads DM Sans from Google Fonts CDN
│   ├── package.json            npm manifest (no test scripts)
│   ├── vite.config.js          Minimal Vite config (react plugin only)
│   ├── tailwind.config.js      Tailwind with custom font families
│   ├── postcss.config.js       PostCSS with Tailwind + Autoprefixer
│   ├── public/                 Static assets served at root (images, fonts, hero-video.mp4)
│   │   └── fonts/              Helvetica Bold.ttf + Helvetica Regular.otf (untracked)
│   ├── dist/                   Vite build output — committed to git (inconsistent with .gitignore)
│   ├── docs/                   Internal workflow text files (not served)
│   └── src/
│       ├── main.jsx            React DOM root mount
│       ├── App.jsx             Client-side page router (useState, 6 pages)
│       ├── index.css           All global styles (~design system, scrollbar, animations)
│       ├── pages/
│       │   ├── Home.jsx        Landing: hero video, countdown, calendar, prediction preview, stats
│       │   ├── Predictions.jsx Full race win probability table (fetches backend on mount)
│       │   ├── H2H.jsx         Driver comparison + prediction (fetches backend on Compare click)
│       │   ├── History.jsx     Past predictions — currently a "coming soon" stub
│       │   ├── Season.jsx      Scrollable 2026 race calendar (hardcoded data)
│       │   └── Contact.jsx     Email copy button + feature request chips
│       ├── components/
│       │   ├── AnimatedCircuit.jsx      SVG circuit path animation component
│       │   ├── NextRaceCircuitCard.jsx  Animated Miami track card for Home
│       │   └── ui/heartbeat-effect-button.jsx  Pulsing CTA button
│       └── data/
│           └── circuits.js     SVG path + viewBox data for Miami track
├── CONTEXT.md                  Living project context and status doc
├── design.md                   Design system reference
└── README.md
```

---

## 3. Entry Points

### Backend

**Start command:** `python -m uvicorn app.main:app --reload` (run from `backend/`)  
**Entry file:** `backend/app/main.py`  
**Port:** 8000

| Route | Method | Handler | Notes |
|-------|--------|---------|-------|
| `/api/health` | GET | `main.py` inline | Returns `{"status": "ok"}` |
| `/api/predictions/next-race` | GET | `routers/predictions.py:get_next_race_prediction` | Reads `miami_predictions.json`, merges full 2026 grid |
| `/api/races/` | GET | `routers/races.py:get_races` | Stub — returns `{"season": 2025, "races": []}` |
| `/api/h2h/compare` | GET | `routers/h2h.py:compare_drivers` | Params: `driver1`, `driver2`, `year` (default 2026); calls FastF1 + Jolpica/OpenF1 |
| `/api/h2h/predict` | GET | `routers/h2h.py:predict_h2h` | Params: `driver1`, `driver2`; loads all 3 years of data, runs scoring model |

No cron jobs, background tasks, Celery workers, or startup scripts exist.

**At import time:** `backend/app/models/predict.py` calls `joblib.load("rf_model.pkl")` — if the `.pkl` is missing, the entire server crashes on startup with `RuntimeError`.

### Frontend

**Start command:** `npm run dev` (run from `frontend/`)  
**Entry file:** `frontend/index.html` → `src/main.jsx` → `src/App.jsx`  
**Port:** 5173

Navigation is driven by `App.jsx`'s `useState` — there are no URL routes (no browser history integration, no deep-linking).

---

## 4. External Dependencies with Network Calls

| Dependency | Where | What it does | Failure mode |
|------------|-------|-------------|--------------|
| **FastF1** (library) | `h2h.py` | Fetches F1 session results (timing, finishing positions) from Ergast / F1 official API; caches to `cache/fastf1_http_cache.sqlite` | `Exception` caught per-race; on total failure falls through to external APIs |
| **OpenF1 API** (`https://api.openf1.org/v1`) | `h2h.py:_load_openf1_results` | Fetches `/sessions` and `/session_result` and `/drivers` for a given year | `urlopen` with 8s timeout; no retry; exception is caught and appended to `source_errors` |
| **Jolpica/Ergast API** (`https://api.jolpi.ca/ergast/f1`) | `h2h.py:_load_jolpica_results` | Fetches full season race results in Ergast format | Same; limit=1000 hardcoded |
| **Google Fonts CDN** (`fonts.googleapis.com`) | `frontend/index.html` | DM Sans 600 weight for brand wordmark | Page renders without font if CDN is unreachable (graceful fallback to Helvetica) |

The frontend makes these fetch calls directly from the browser:

| URL | Triggered by | File:line |
|-----|-------------|-----------|
| `http://localhost:8000/api/predictions/next-race` | Page mount | `Predictions.jsx:174` |
| `http://localhost:8000/api/h2h/compare?driver1=...` | Compare button click | `H2H.jsx:375` |
| `http://localhost:8000/api/h2h/predict?driver1=...` | Compare button click | `H2H.jsx:376` |

Both frontend fetch URLs are hardcoded to `localhost:8000`.

---

## 5. Data Flow

### Race Predictions

```
[Offline, manual]
FastF1 data (2022-2026)
    └─→ Training script (not in repo)
            └─→ rf_model.pkl  (or miami Gradient Boosting model)
                    └─→ miami_predictions.json  (22 drivers, hand-generated, committed to repo)

[Runtime]
Browser (Predictions.jsx mount)
    └─→ GET http://localhost:8000/api/predictions/next-race
            └─→ predictions.py: load miami_predictions.json
                    └─→ _complete_2026_grid(): fill missing drivers with near-zero stub probabilities
                            └─→ return sorted JSON → frontend renders bar chart table
```

The Home page's "Latest Prediction" section is **not** fetched from the API — it has a hardcoded `TOP3` constant in `Home.jsx:287-291` that must be manually kept in sync with `miami_predictions.json`.

### H2H Comparison

```
Browser (H2H.jsx "Compare" click)
    │
    ├─→ GET /api/h2h/compare?driver1=X&driver2=Y&year=2026
    │       └─→ _load_results(2026)
    │               ├─→ FastF1 session load (cached SQLite) → if year < 2026 and rows found: done
    │               ├─→ Jolpica API (HTTP, synchronous)
    │               └─→ OpenF1 API (HTTP, synchronous)
    │           → _build_stats(rows, driver1/2) + _championship_position()
    │           → return driver stats JSON
    │
    └─→ GET /api/h2h/predict?driver1=X&driver2=Y
            └─→ _load_results(2024) + _load_results(2025) + _load_results(2026) [ALL years]
                    (same 3-source waterfall × 3 years)
                → weighted scoring: H2H record 40% + avg finish 30% + recent form 30%
                → return predicted_winner, confidence, h2h_record, reasoning
```

**No database.** All computed stats are re-derived on every request from FastF1/external API data. The SQLite file is only FastF1's HTTP cache, not a data store.

---

## 6. Test Coverage

**Zero tests exist in this repository.**

- No pytest files, no `tests/` directory, no `conftest.py`
- No Jest config, no `*.test.js` / `*.spec.jsx` files
- No test script in `frontend/package.json`
- No CI configuration (no `.github/workflows/`, no `Dockerfile`)

Current pass rate: N/A — nothing to run.

**What is entirely untested:**
- All 5 backend API endpoints
- The prediction loading and grid-completion logic
- The H2H scoring model and all data-loading fallback paths
- All 6 frontend pages
- Any state management or animation logic

---

## 7. Tech Debt and Fragility

### Critical

**1. Frontend fetch URLs hardcoded to `localhost:8000`**  
`Predictions.jsx:174`, `H2H.jsx:375-376`. Deploying the frontend to any host will immediately break both pages. Needs an env variable (`VITE_API_BASE_URL`).

**2. No version pins in `requirements.txt`**  
Every dependency is listed bare (e.g., `fastapi`, not `fastapi==0.135.3`). A fresh install on a new machine or CI could pull incompatible versions silently.

**3. CORS locked to `localhost:5173`**  
`main.py:9`: `allow_origins=["http://localhost:5173"]`. Any deployed frontend URL will be blocked immediately.

**4. `rf_model.pkl` crashes the entire server on startup if missing**  
`predict.py:10`: raises `RuntimeError` at import time. Because `predict.py` is imported at module load by the application (even though it's currently unused at runtime), a missing `.pkl` file kills the server before handling any request. The file is a binary artifact committed to git but has no provenance (no training script in the repo).

**5. `predict.py` is dead code**  
The `get_predictions()` function is never called by any router. The predictions endpoint reads `miami_predictions.json` directly. The model is loaded eagerly but serves no purpose at runtime, while also being a crash vector.

### High

**6. Home page TOP3 predictions are hardcoded in JSX**  
`Home.jsx:287-291` hardcodes `Antonelli 70.91%, Russell 17.87%, Leclerc 6.06%`. These must be manually kept in sync with `miami_predictions.json` and will become stale after Miami GP.

**7. Race calendar duplicated verbatim in two files**  
The full 24-race `RACES` array is copy-pasted identically in `Home.jsx:5-30` and `Season.jsx:3-28`. Any calendar correction requires editing both files.

**8. `/api/h2h/predict` loads all years on every request with no caching**  
`h2h.py:341-343`: iterates 2024, 2025, 2026 and runs the full 3-source data loading waterfall for each year. Under any real load, this endpoint will time out or be extremely slow (potentially 30-60+ seconds per request for cache-misses).

**9. Synchronous I/O blocks FastAPI's async event loop**  
`_fetch_json` uses `urllib.request.urlopen` (blocking I/O) called directly in route handlers. FastF1's `session.load()` is also blocking. This means one slow H2H request starves all other concurrent requests.

**10. The `strict` parameter in `_load_fastf1_results` silently swallows per-race errors**  
`h2h.py:129-132`: the `except` block inside the per-race loop does `continue` regardless of whether `strict=True`. So in strict mode, failures for individual races are silently eaten rather than surfaced.

### Medium

**11. No React error boundaries**  
An unhandled JS exception in any page component produces a blank white screen with no recovery. A single error boundary at the App level would prevent total UI loss.

**12. `frontend/dist/` is committed to git**  
The build output is tracked in version control despite `dist/` appearing in `.gitignore`. Build artifacts in git cause merge conflicts, inflate repo size, and give a false sense that the deployed build is up-to-date.

**13. Python 3.14 (pre-release)**  
The `__pycache__` paths confirm CPython 3.14 is in use. Some packages (particularly those with C extensions) may not yet have stable wheels for 3.14, making installation fragile on other machines.

**14. `races.py` stub returns wrong season**  
`races.py:9`: hardcodes `"season": 2025` during the 2026 season. This route is otherwise unused but misleading.

**15. No input sanitisation on H2H driver query params**  
`driver1` and `driver2` are used in string comparisons only (no SQL, no shell), so there's no injection risk. However, there is no explicit allowlist validation — any string is accepted and silently treated as an unknown driver, returning ambiguous empty-stats responses rather than a clear 400.

**16. Email address hardcoded in Contact.jsx source**  
`Contact.jsx:3`: `const EMAIL = 'a.kakarantzas@acg.edu'`. Low risk in isolation, but PII in source code complicates sanitising public forks or logs.

**17. Google Fonts loaded from external CDN at runtime**  
`index.html:7`: a render-blocking font request to `fonts.googleapis.com`. Slow or unavailable on restrictive networks; should be self-hosted (the Helvetica `.ttf`/`.otf` files are already in `public/fonts/` but unused).

**18. H2H prediction card title is hardcoded "Miami GP"**  
`H2H.jsx:271`: "Miami GP Head to Head Winner Prediction" regardless of which next race is configured.

**19. No `.env` file for backend**  
Only `.env.example` exists with a single key (`APP_ENV=development`). `python-dotenv` is listed in requirements but nothing reads from `.env` in the current codebase — the infrastructure for secrets management is scaffolded but unused.

**20. `useCountUp` called inside `.map()` in Home.jsx**  
`Home.jsx:559-565`: React hooks are called inside an array `.map()` callback. This violates the Rules of Hooks (hooks must not be called conditionally or inside loops). It appears to work by coincidence because the array is always the same length, but it will produce a React warning and could cause subtle bugs if the array length ever changes.

---

## Top 5 Concerns Before a Refactor

**1. Hardcoded `localhost:8000` in the frontend — deployment blocker**  
Both data-fetching pages (`Predictions`, `H2H`) will be completely broken the moment the frontend is deployed anywhere. Introduce a `VITE_API_BASE_URL` env variable and replace both hardcoded strings before touching anything else.

**2. Dead `predict.py` + unstable startup crash**  
The `rf_model.pkl` is eagerly loaded at module import but the model is never actually called. It will kill the server on any machine without the exact `.pkl` file. Decide: either wire the model into the predictions router to replace the static JSON, or delete `predict.py` entirely. Either way, the eager crash-on-import needs to go.

**3. Zero tests — refactoring is flying blind**  
There are no tests at any layer. Before any structural refactor, add at minimum: one smoke test per API endpoint (does it return 200 with the expected shape?) and basic unit tests for the H2H scoring model. Without these, you won't know what you've broken until a user reports it.

**4. H2H performance and blocking I/O — the /predict endpoint is unusable under load**  
`/api/h2h/predict` makes synchronous HTTP calls to 3 external APIs for 3 years of data on every request. This blocks FastAPI's event loop and will time out in production. Before deployment: cache results in memory or a lightweight DB (even sqlite), make the HTTP calls async (`httpx` with `asyncio`), and consider pre-fetching/warming on startup.

**5. No version pins in requirements.txt + Python 3.14 pre-release**  
The entire backend dependency graph is unpinned, and it runs on a pre-release CPython version. Before any serious deployment or CI setup, pin all packages (`pip freeze > requirements.txt`), consider dropping to Python 3.12 LTS, and add a `pyproject.toml` or at minimum document the expected Python version explicitly.
