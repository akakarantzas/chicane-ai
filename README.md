# ChicaneAI

[![ci](https://github.com/akakarantzas/chicane-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/akakarantzas/chicane-ai/actions/workflows/ci.yml)

AI-powered Formula 1 analytics and race prediction web app.

## Features

- **Race predictions** - win probability for each driver using a Gradient Boosting model trained on FastF1 data
- **H2H comparisons** - reconciled driver statistics with freshness reporting and a historical finish-ahead heuristic
- **History** - past predictions verified against real results
- **Season calendar** - 2026 F1 race schedule

## Stack

**Frontend**
- React + Tailwind CSS (Vite)

**Backend**
- FastAPI (Python)

**ML**
- scikit-learn (Gradient Boosting + Random Forest)
- FastF1 (real F1 timing and results data)

## Documentation

- `docs/CONTEXT.md` - project context and current architecture notes
- `docs/design.md` - design system reference
- [H2H model evaluation](docs/h2h-model-evaluation.md) - offline experiment protocol and measured results
- [H2H uncertainty](docs/h2h-uncertainty.md) - uncalibrated scores, evidence safeguards and calibration audit
- [H2H monitoring](docs/h2h-monitoring.md) - score explanations, pre-race records and published-result tracking
- [Automatic prediction history](docs/prediction-history.md) - forecast publication, archiving and automatic race-result updates

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
Remove-Item -Recurse -Force .\venv -ErrorAction SilentlyContinue
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Runs on `http://127.0.0.1:8000`

Health check: `http://127.0.0.1:8000/api/health`

Run backend tests:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m pytest tests
```

For the contact form, copy `backend/.env.example` to `backend/.env` and configure the Resend/contact values.

Run a single backend worker because H2H comparisons and predictions share
in-memory data. Multiple workers require sticky routing or shared storage.
See [the H2H technical reference](docs/h2h.md) for caching and deployment details.

If PowerShell blocks the activation script, allow local scripts for your user:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Then run:

```powershell
.\venv\Scripts\Activate.ps1
```

## What's Next

- Model improvements
- Deployment

## License

MIT
