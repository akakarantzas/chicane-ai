# ChicaneAI

AI-powered Formula 1 analytics and race prediction web app.

## Features

- **Race predictions** — win probability for each driver using a Gradient Boosting model trained on FastF1 data
- **H2H comparisons** — head-to-head driver stats pulled live from FastF1 with an ML prediction card
- **History** — past predictions verified against real results
- **Season calendar** — 2026 F1 race schedule

## Track record

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

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
# Runs on http://localhost:8000
```

## What's next

- Mobile responsiveness
- Model improvements
- Post-race result verification cards
- Deployment

## License

MIT
