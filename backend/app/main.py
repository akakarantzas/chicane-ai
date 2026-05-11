from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from app.routers import predictions, races, h2h, contact

app = FastAPI(title="Chicane.ai API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(predictions.router)
app.include_router(races.router)
app.include_router(h2h.router)
app.include_router(contact.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
