import html
import json
import os
import re
import time
from collections import defaultdict
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import APIRouter, HTTPException
from fastapi import Request as FastAPIRequest
from pydantic import BaseModel

router = APIRouter(prefix="/api")

_EMAIL_RE = re.compile(r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$')
_RATE_STORE: dict[str, list[float]] = defaultdict(list)
_RATE_LIMIT = 3
_RATE_WINDOW = 3600


class ContactPayload(BaseModel):
    name: str | None = None
    email: str
    message: str


@router.post("/contact")
def submit_contact(payload: ContactPayload, request: FastAPIRequest):
    if not _EMAIL_RE.match(payload.email.strip()):
        raise HTTPException(status_code=422, detail="Please enter a valid email address.")

    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=422, detail="Message cannot be empty.")
    if len(message) > 2000:
        raise HTTPException(status_code=422, detail="Message must be under 2000 characters.")

    ip = request.client.host if request.client else "unknown"
    now = time.time()
    recent = [t for t in _RATE_STORE[ip] if now - t < _RATE_WINDOW]
    if len(recent) >= _RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Too many submissions. Please try again later.")
    _RATE_STORE[ip] = recent + [now]

    api_key = os.getenv("RESEND_API_KEY", "")
    to_email = os.getenv("CONTACT_EMAIL", "")
    if not api_key or not to_email:
        raise HTTPException(status_code=500, detail="Email service not configured.")

    name_str = html.escape(payload.name.strip()) if payload.name and payload.name.strip() else "Anonymous"
    email_str = html.escape(payload.email.strip())
    message_str = html.escape(message).replace("\n", "<br>")

    body = json.dumps({
        "from": "onboarding@resend.dev",
        "to": [to_email],
        "reply_to": payload.email.strip(),
        "subject": f"ChicaneAI — message from {name_str}",
        "html": (
            f"<p><strong>Name:</strong> {name_str}</p>"
            f"<p><strong>Email:</strong> {email_str}</p>"
            f"<p><strong>Message:</strong></p>"
            f"<p>{message_str}</p>"
        ),
    }).encode()

    req = Request(
        "https://api.resend.com/emails",
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "ChicaneAI/1.0",
        },
        method="POST",
    )
    try:
        with urlopen(req, timeout=10) as resp:
            resp.read()
    except HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"[contact] Resend HTTP {e.code}: {body}")
        raise HTTPException(status_code=502, detail="Failed to send message. Please try again.")
    except (URLError, OSError) as e:
        print(f"[contact] Resend network error: {e}")
        raise HTTPException(status_code=502, detail="Failed to send message. Please try again.")

    return {"success": True}
