# ChicaneAI

AI-powered Formula 1 analytics and race prediction web app.

## Features

- **Race predictions** - win probability for each driver using a Gradient Boosting model trained on FastF1 data
- **H2H comparisons** - head-to-head driver stats pulled live from FastF1 with an ML prediction card
- **History** - past predictions verified against real results
- **Season calendar** - 2026 F1 race schedule

## Track Record

Accurately predicted Antonelli (Mercedes) as the 2026 Miami GP winner with 70.9% confidence.

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

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Runs on `http://127.0.0.1:8000`

Health check: `http://127.0.0.1:8000/api/health`

If PowerShell blocks the activation script, allow local scripts for your user:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Then run:

```powershell
.\venv\Scripts\Activate.ps1
```

## What's Next

- Mobile responsiveness
- Model improvements
- Deployment

## License

MIT
