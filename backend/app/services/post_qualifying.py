"""Background inference from frozen pre-race features; request handlers read JSON only."""
import copy
import hashlib
import json
import logging
import os
import tempfile
from datetime import timedelta
from pathlib import Path
from threading import Lock

from app.services import prediction_history as history
from app.services.h2h_schedule import utc_now
from app.services.qualifying_results import completed_qualifying, validate_grid

logger = logging.getLogger(__name__)
MODELS_DIR = Path(__file__).resolve().parents[1] / "models"
_lock = Lock()


def enabled():
    return os.getenv("POST_QUALIFYING_ENABLED", "true").lower() in {"true", "1", "yes"}


def digest(value):
    return hashlib.sha256(history.encoded(value).encode()).hexdigest()


def update_path(predictions, metadata):
    directory = Path(os.getenv("PREDICTION_UPDATES_DIR", str(MODELS_DIR.parents[1] / "data" / "prediction-updates")))
    return directory / (digest([predictions, metadata]) + ".json")


def read_update(predictions, metadata):
    """One atomic document, tied to the exact base forecast, survives restarts."""
    try:
        document = json.loads(update_path(predictions, metadata).read_text(encoding="utf-8"))
        updated = document["metadata"]
        history.validate_forecast(document["predictions"], updated)
        if (document["base_hash"] != digest([predictions, metadata])
                or any(updated[key] != metadata[key] for key in ("race", "circuit", "model_version"))
                or updated["prediction_input"]["grid_source"] != "qualifying_grid"
                or history.timestamp(updated["generated_at"]) >= history.timestamp(document["race_start"])
                or history.timestamp(updated["generated_at"]) > utc_now()
                or {(p["driver"], p["team"]) for p in predictions}
                != {(p["driver"], p["team"]) for p in document["predictions"]}
                or abs(sum(p["probability"] for p in document["predictions"]) - 1) > .002):
            raise ValueError("Invalid post-qualifying publication")
        return document
    except FileNotFoundError:
        return None
    except (ValueError, KeyError, TypeError, OSError):
        logger.warning("Ignoring unreadable post-qualifying publication")
        return None


def infer(bundle, model_path, metadata, positions=None):
    import joblib
    import numpy as np
    import pandas as pd
    import sklearn
    from threadpoolctl import threadpool_limits

    if bundle["sklearn_version"] != sklearn.__version__:
        raise ValueError("Saved model requires scikit-learn " + bundle["sklearn_version"])
    if hashlib.sha256(model_path.read_bytes()).hexdigest() != bundle["model_sha256"]:
        raise ValueError("Saved model does not match its inference features")
    rows = pd.DataFrame(bundle["rows"])
    if positions is not None:
        validate_grid(positions, bundle["rows"])
        rows["GridPosition"] = rows["DriverCode"].map(positions)
    with threadpool_limits(limits=2):
        model = joblib.load(model_path)
        raw = model.predict_proba(rows[bundle["features"]])[:, 1]
    points = rows["AvgPoints5"].clip(lower=0)
    team_points = rows["TeamAvgPoints5"].clip(lower=0)
    prior = (1 / rows["GridPosition"].clip(lower=1) + points / (points.max() or 1)
             + team_points / (team_points.max() or 1) + rows["WinRate10"].clip(lower=0)
             + rows[bundle["circuit_win_rate_feature"]].clip(lower=0))
    config = metadata["prediction_postprocess"]
    weight = config["model_weight"]
    probabilities = weight * raw + (1 - weight) * (prior / prior.sum()).to_numpy() + config["floor_before_normalization"]
    probabilities /= probabilities.sum()
    if not np.isfinite(probabilities).all():
        raise ValueError("Non-finite inference output")
    predictions = [{"driver": row["driver"], "team": row["TeamName"], "probability": round(float(prob), 4)}
                   for row, prob in zip(bundle["rows"], probabilities)]
    history.validate_forecast(predictions, metadata)
    return sorted(predictions, key=lambda p: p["probability"], reverse=True)


def publish_atomic(path, document):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent, delete=False) as output:
            temporary = Path(output.name)
            output.write(history.encoded(document))
            output.flush()
            os.fsync(output.fileno())
        temporary.replace(path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def refresh(models_dir=MODELS_DIR, name="singapore"):
    if not enabled() or not history.enabled():
        return "disabled"
    with _lock:
        models_dir = Path(models_dir)
        if (models_dir / ".prediction-publish.lock").exists():
            return "artifacts_updating"
        predictions = json.loads((models_dir / f"{name}_predictions.json").read_text(encoding="utf-8"))
        metadata = json.loads((models_dir / f"{name}_metadata.json").read_text(encoding="utf-8"))
        history.validate_forecast(predictions, metadata)
        if metadata.get("prediction_input", {}).get("grid_source") == "qualifying_grid":
            return "already_post_qualifying"
        now = utc_now()
        event = history.resolve_event(metadata, now)
        if not event.time_confirmed or now >= event.starts_at:
            return "closed"
        if now < event.starts_at - timedelta(days=4):
            return "waiting_for_weekend"
        bundle = json.loads((models_dir / f"{name}_inference.json").read_text(encoding="utf-8"))
        base_hash = digest([predictions, metadata])
        if bundle["schema_version"] != 1 or bundle["base_hash"] != base_hash:
            raise ValueError("Inference features do not match the published forecast")
        qualifying = completed_qualifying(event, bundle["rows"], now)
        if qualifying is None:
            return "waiting_for_qualifying"
        validate_grid(qualifying["positions"], bundle["rows"])
        grid_hash = digest(qualifying["positions"])
        existing = read_update(predictions, metadata)
        if existing and existing["grid_hash"] == grid_hash:
            return "unchanged"
        model_path = models_dir / f"{name}_model.pkl"
        # A baseline parity check prevents feature/configuration drift before any publication.
        if infer(bundle, model_path, metadata) != sorted(predictions, key=lambda p: p["probability"], reverse=True):
            raise ValueError("Frozen features do not reproduce the original forecast")
        updated_predictions = infer(bundle, model_path, metadata, qualifying["positions"])
        generated = utc_now()
        if generated >= event.starts_at:
            return "closed"
        updated_metadata = copy.deepcopy(metadata)
        updated_metadata["generated_at"] = generated.isoformat()
        updated_metadata["prediction_input"] = {
            "grid_source": "qualifying_grid", "grid_basis": "qualifying_classification",
            "grid_note": "Qualifying order; penalties may change the starting grid.",
            "observed_at": generated.isoformat(), **qualifying,
        }
        # Archive both stages before publication. Never backfill forecasts after race start.
        for values, meta in ((predictions, metadata), (updated_predictions, updated_metadata)):
            result = history.record_forecast(values, meta, event=event)
            if result["status"] not in {"recorded", "already_recorded"}:
                return "closed"
        # Publication can race with a deployment or a slow archive write.
        if utc_now() >= event.starts_at or (models_dir / ".prediction-publish.lock").exists():
            return "closed"
        current = [json.loads((models_dir / f"{name}_{suffix}.json").read_text(encoding="utf-8"))
                   for suffix in ("predictions", "metadata")]
        if digest(current) != base_hash:
            return "artifacts_updating"
        publish_atomic(update_path(predictions, metadata), {
            "base_hash": base_hash, "grid_hash": grid_hash, "race_start": event.starts_at.isoformat(),
            "predictions": updated_predictions, "metadata": updated_metadata,
        })
        return "published"


def run_worker(stop):
    while not stop.is_set():
        try:
            logger.info("Post-qualifying update: %s", refresh())
        except Exception:
            # Keep serving the latest successfully published forecast and retry next minute.
            logger.warning("Post-qualifying update deferred")
        stop.wait(60)
