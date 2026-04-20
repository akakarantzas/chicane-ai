# Chicane.ai — Project Context

## What it is
AI-powered F1 analytics and race prediction platform built by Apostolos Kakarantzas,
IT student at Deree - The American College of Greece, specializing in Intelligent Systems & Automation.

## Stack
- Frontend: React + Tailwind CSS (Vite), running on localhost:5173
- Backend: FastAPI (Python), running on localhost:8000
- ML Models: Gradient Boosting classifier (race predictions) + scoring model (H2H predictions)
- Data source: FastF1 library (real F1 timing and results data)
- Database: PostgreSQL (planned, not yet implemented)
- Hosting: Not yet deployed

## Repo
github.com/akakarantzas/chicane-ai

## Project structure
chicane-ai/
├── frontend/
│   ├── public/ (hero-bg.png, hero-video.mp4, logo-mark.png, white-f1-car.png, reference images)
│   └── src/
│       ├── pages/
│       │   ├── Home.jsx (main landing page)
│       │   ├── Predictions.jsx (full race win probability page)
│       │   ├── H2H.jsx (head to head driver comparison)
│       │   ├── History.jsx (past predictions vs actual results)
│       │   ├── Season.jsx (2026 race calendar)
│       │   └── Contact.jsx (contact page)
│       ├── App.jsx (routing via useState, pages: home/predictions/h2h/history/calendar/contact)
│       └── index.css (global styles + scrollbar + hover states)
├── backend/
│   └── app/
│       ├── main.py (FastAPI app, CORS for localhost:5173)
│       ├── routers/
│       │   ├── predictions.py (GET /api/predictions/next-race — reads miami_predictions.json)
│       │   ├── races.py (GET /api/races/)
│       │   └── h2h.py (GET /api/h2h/compare, GET /api/h2h/predict — uses FastF1)
│       └── models/
│           ├── rf_model.pkl (original Monaco RF model)
│           ├── miami_model.pkl (Miami GP Gradient Boosting model)
│           └── miami_predictions.json (pre-generated predictions served by API)
├── design.md (living design system)
├── CONTEXT.md (this file)
└── README.md

## Navigation tabs (current)
Predictions · H2H · History · Calendar · Contact

## Current site state (as of April 2026)
- Home page: looping video hero (hero-video.mp4), "Miami GP predictions now live!" badge,
  "Predict. Verify. Repeat." tagline, stats bar, Next Race countdown (Miami GP May 3 2026),
  Race Calendar with scrollable cards, Latest Prediction preview, 24/11/22/6 stats with count-up animation
- Predictions page: full Miami GP win probability table with gradient bars
- H2H page: driver comparison with real FastF1 data, VS badge, comparison bars,
  Miami GP H2H prediction card below results with confidence bar
- History page: Monaco 2025 verified prediction card (4/4 top finishers identified)
- Season/Calendar page: 2026 season race cards, scrollable
- Contact page: email, GitHub, LinkedIn cards with feature requests section

## Credibility anchor
Correctly identified all 4 top finishers at 2025 Monaco GP before the race
(Norris P1, Leclerc P2, Piastri P3, Verstappen P4 — group prediction, not finishing order)

## Miami GP 2026 Predictions (current)
P1: Antonelli (Mercedes) — 70.9%
P2: Russell (Mercedes) — 17.9%
P3: Leclerc (Ferrari) — 6.1%
P4: Hamilton (Ferrari) — 1.3%
P5: Verstappen (Red Bull) — 1.3%
Model: Gradient Boosting, trained on 2022-2026 F1 data using FastF1
Repo: github.com/akakarantzas/f1-2026-miami-grand-prix-winner-prediction

## Backend API endpoints
GET /api/health → {"status": "ok"}
GET /api/predictions/next-race → Miami GP predictions from miami_predictions.json
GET /api/races/ → placeholder races list
GET /api/h2h/compare?driver1=ANT&driver2=VER&year=2026 → real FastF1 H2H stats
GET /api/h2h/predict?driver1=ANT&driver2=VER → H2H winner prediction using scoring model

## Design system (summary — full details in design.md)
- Background: #0C0C0E
- Cards: #1A1A1F, borderRadius 12px, padding 24px
- Surface: #27272A
- Accent red: #E8002D
- P1: #E8002D, P2: #FF6B35, P3: #FFB800
- Primary text: #F4F4F5, Muted: #A1A1AA
- Border: rgba(255,255,255,0.06)
- Logo: DM Sans italic 600 -0.05em letter-spacing
- Body: Helvetica, Arial, sans-serif
- Buttons: 44px height, 8px radius
- Sections: 80px top/bottom padding, maxWidth 1280px centered, padding 0 32px
- Scrollbar: #E8002D thumb, #0C0C0E track

## What's done ✅
- All 6 pages complete and working
- Real ML predictions served via FastAPI
- FastF1 H2H comparison with live data
- H2H ML prediction card with confidence bar
- Count-up animation on stats cards
- Design system enforced (buttons, cards, typography, spacing)
- Hover states on all interactive elements
- Custom scrollbar
- Monaco 2025 prediction documented in History
- All code on GitHub

## What's next 🔜
- Mobile responsiveness (critical before deployment)
- Deployment: Render (backend) + Vercel (frontend)
- Update countdown and predictions after Miami GP result
- Add Miami GP result to History page after the race
- Drivers standings page
- Post-Miami H2H result verification

## How to start locally
Terminal 1: cd Documents\chicane-ai\frontend && npm run dev
Terminal 2: cd Documents\chicane-ai\backend && python -m uvicorn app.main:app --reload
Terminal 3 (Claude Code): cd Documents\chicane-ai && claude
Browser: http://localhost:5173

## How to save progress
cd Documents\chicane-ai
git add .
git commit -m "description"
git push
