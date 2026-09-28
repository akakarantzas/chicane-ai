import os
from contextlib import asynccontextmanager
from threading import Event, Thread

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from app.routers import predictions, h2h, contact
from app.services import prediction_history, post_qualifying


@asynccontextmanager
async def lifespan(app):
    stop = Event()
    worker = None
    qualifying_worker = None
    if prediction_history.enabled():
        worker = Thread(target=prediction_history.run_worker, args=(stop,),
                        name="prediction-history", daemon=True)
        worker.start()
    if post_qualifying.enabled() and prediction_history.enabled():
        qualifying_worker = Thread(target=post_qualifying.run_worker, args=(stop,),
                                   name="post-qualifying", daemon=True)
        qualifying_worker.start()
    try:
        yield
    finally:
        stop.set()
        if worker is not None:
            worker.join(timeout=2)
        if qualifying_worker is not None:
            qualifying_worker.join(timeout=2)


app = FastAPI(title="Chicane.ai API", lifespan=lifespan)

cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(predictions.router)
app.include_router(h2h.router)
app.include_router(contact.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
