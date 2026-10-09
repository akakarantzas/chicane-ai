import html
import json
import logging
import os
import re
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field

router = APIRouter(prefix="/api")

_EMAIL_RE = re.compile(r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$')
logger = logging.getLogger(__name__)
_PLACEHOLDER_VALUES = {
    "re_placeholder_replace_me",
    "you@example.com",
}


class ContactPayload(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    name: str | None = Field(default=None, max_length=100, pattern=r"^[^\r\n]*$")
    email: str = Field(min_length=3, max_length=254)
    message: str = Field(min_length=1, max_length=2000)


def _is_placeholder(value: str) -> bool:
    normalized = value.strip().lower()
    return (
        not normalized
        or normalized in _PLACEHOLDER_VALUES
        or "placeholder" in normalized
        or "replace_me" in normalized
    )


def _get_contact_config() -> tuple[str, str]:
    api_key = os.getenv("RESEND_API_KEY", "")
    to_email = os.getenv("CONTACT_EMAIL", "")
    if _is_placeholder(api_key) or _is_placeholder(to_email):
        raise HTTPException(status_code=500, detail="Email service not configured.")
    return api_key.strip(), to_email.strip()


@router.post("/contact")
def submit_contact(payload: ContactPayload):
    if not _EMAIL_RE.match(payload.email.strip()):
        raise HTTPException(status_code=422, detail="Please enter a valid email address.")

    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=422, detail="Message cannot be empty.")
    if len(message) > 2000:
        raise HTTPException(status_code=422, detail="Message must be under 2000 characters.")

    api_key, to_email = _get_contact_config()

    name_str = html.escape(payload.name.strip()) if payload.name and payload.name.strip() else "Anonymous"
    email_str = html.escape(payload.email.strip())
    message_str = html.escape(message).replace("\n", "<br>")

    body = json.dumps({
        "from": "onboarding@resend.dev",
        "to": [to_email],
        "reply_to": payload.email.strip(),
        "subject": f"ChicaneAI - message from {name_str}",
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
        # Provider bodies/exception text can include credentials or submitted data.
        logger.warning("Contact delivery rejected by provider (HTTP %s)", e.code)
        raise HTTPException(status_code=502, detail="Failed to send message. Please try again.")
    except (URLError, OSError):
        logger.warning("Contact delivery failed due to a network error")
        raise HTTPException(status_code=502, detail="Failed to send message. Please try again.")

    return {"success": True}
