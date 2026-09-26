# ChicaneAI

[![ci](https://github.com/akakarantzas/chicane-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/akakarantzas/chicane-ai/actions/workflows/ci.yml)

AI-powered Formula 1 analytics and race prediction web app.

## Features

- **Race predictions** - win probability for each driver using a Gradient Boosting model trained on FastF1 data
- **H2H comparisons** - reconciled driver statistics with freshness reporting and a historical finish-ahead heuristic
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

## Documentation

- `docs/CONTEXT.md` - project context and current architecture notes
- `docs/design.md` - design system reference
- `docs/security_audit.md` - latest security audit notes
- [H2H model evaluation](docs/h2h-model-evaluation.md) - offline experiment protocol and measured results

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

For the contact form, copy `backend/.env.example` to `backend/.env` and fill in the Resend/contact values. The H2H cache TTL can be adjusted with `H2H_CACHE_TTL_SECONDS`.

H2H comparison and prediction share a process-local season snapshot of results
and standings. Defaults are 15 minutes for the current season and six hours for
past seasons; a positive `H2H_CACHE_TTL_SECONDS` overrides both (capped at 24 hours).
Partial/failed loads retry on a later request after a short cooldown (up to
60 seconds); a newly due round bypasses the usual TTL. Stale fallback data is
explicitly labeled and never served beyond 24 hours. These are request-driven
refreshes, not background polling, and retrieval time is not provider publication
time. See [the H2H rollout](docs/h2h-accuracy-plan.md) for coverage semantics.

The UI pins predictions to its comparison snapshot. Up to three versions per
season are retained in memory; restart/eviction returns HTTP 409 and asks for a
new comparison. Run a single backend worker, as in the command above, or use
sticky routing. Multiple workers/replicas without affinity require a shared
snapshot store before pinning can work reliably across them.

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
