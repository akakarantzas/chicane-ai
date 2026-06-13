# ChicaneAI

[![ci](https://github.com/akakarantzas/chicane-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/akakarantzas/chicane-ai/actions/workflows/ci.yml)

AI-powered Formula 1 analytics and race prediction web app.

## Features

- **Race predictions** - win probability for each driver using a Gradient Boosting model trained on FastF1 data
- **H2H comparisons** - head-to-head driver stats pulled live from FastF1 with an ML prediction card
- **History** - past predictions verified against real results
- **Season calendar** - 2026 F1 race schedule

## Track Record

Accurately predicted Antonelli (Mercedes) as the 2026 Miami GP winner.

## Stack

**Frontend**
- React + Tailwind CSS (Vite)

**Backend**
- FastAPI (Python)

**ML**
- scikit-learn (Gradient Boosting + Random Forest)
- FastF1 (real F1 timing and results data)

## Setup

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173`

### Backend

Recommended: Python 3.12.

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Runs on `http://127.0.0.1:8000`

Health check: `http://127.0.0.1:8000/api/health`

Run backend tests:

```powershell
cd backend
python -m pip install -r requirements.txt
python -m pytest
```

For the contact form, copy `backend/.env.example` to `backend/.env` and fill in the Resend/contact values. The H2H cache TTL can be adjusted with `H2H_CACHE_TTL_SECONDS`.

If PowerShell blocks the activation script, allow local scripts for your user:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Then run:

```powershell
.\venv\Scripts\Activate.ps1
```

## Barcelona Model Update

Train and export the Barcelona-Catalunya model in the standalone ML repo:

- https://github.com/akakarantzas/f1-2026-barcelona-catalunya-grand-prix-winner-prediction

```powershell
cd ..\f1-2026-barcelona-catalunya-grand-prix-winner-prediction
python train_barcelona_catalunya.py
```

Optional prediction inputs in the model repo:

- `qualifying_grid.json` after qualifying
- `market_odds.json` for pre-race sportsbook consensus

Sync the exported app artifacts into `chicane-ai`:

```powershell
cd ..\chicane-ai
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\sync_barcelona_model.ps1
```

Verify before committing:

```powershell
cd backend
python -m pytest tests
cd ..\frontend
npm run build
```

Commit synced artifacts only when the exported predictions or metadata changed.

## What's Next

- Model improvements
- Deployment

## License

MIT
