# Chicane.ai

AI-powered F1 analytics platform.

## Setup

### Frontend
```bash
cd frontend
npm install
```

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

## Running locally

### Frontend
```bash
cd frontend
npm run dev
# Runs on http://localhost:5173
```

### Backend
```bash
cd backend
uvicorn app.main:app --reload
# Runs on http://localhost:8000
# Health check: GET http://localhost:8000/api/health
```
