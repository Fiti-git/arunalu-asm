"""WhatsApp Cloud API bridge for the chatbot.

Inbound  : Meta posts user messages to the webhook → we call the chatbot →
           reply text is sent back via Cloud API.
Outbound : Helper `send_text(to, text)` callable from anywhere in Django.

All credentials come from `settings.WHATSAPP_*` (see aas/settings.py).
Webhook signature validation uses WHATSAPP_APP_SECRET.

Resolution rule:
  - The sender's WhatsApp phone number (E.164 without '+') is matched against
    `Employee.phone_number` to find the user. If no match, replies are still
    sent but the chatbot context is the (anonymous) sender.
"""
import hmac
import hashlib
import json
import logging
import re

import requests
from django.conf import settings
from django.contrib.auth.models import User

from main.models import Employee
from .llm import ask
from .models import ChatbotLog

logger = logging.getLogger(__name__)


def _normalize_msisdn(num):
    """Strip everything except digits; '+94 71 234 5678' → '94712345678'."""
    return re.sub(r"\D", "", num or "")


def _resolve_user(from_msisdn):
    """Find an Employee whose phone_number matches the WhatsApp sender."""
    if not from_msisdn:
        return None
    target = _normalize_msisdn(from_msisdn)
    if not target:
        return None
    # Try exact, then suffix match (handles country-code variations).
    for emp in Employee.objects.exclude(phone_number__isnull=True).exclude(phone_number="").select_related("user"):
        if _normalize_msisdn(emp.phone_number) == target or target.endswith(_normalize_msisdn(emp.phone_number)):
            return emp.user
    return None


def verify_signature(raw_body, header_signature):
    """Validate Meta's X-Hub-Signature-256 header. Returns True if valid."""
    secret = getattr(settings, "WHATSAPP_APP_SECRET", "") or ""
    if not secret:
        # No secret configured — accept (development) but log a warning.
        logger.warning("WHATSAPP_APP_SECRET not set; skipping signature verification.")
        return True
    if not header_signature or not header_signature.startswith("sha256="):
        return False
    expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, header_signature.split("=", 1)[1])


def send_text(to_msisdn, text):
    """Send a WhatsApp text message via Cloud API. Returns (ok, response_json|error)."""
    token = getattr(settings, "WHATSAPP_ACCESS_TOKEN", "") or ""
    phone_id = getattr(settings, "WHATSAPP_PHONE_NUMBER_ID", "") or ""
    version = getattr(settings, "WHATSAPP_GRAPH_VERSION", "v20.0")
    if not token or not phone_id:
        return False, {"error": "WhatsApp not configured (set WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID)."}
    url = f"https://graph.facebook.com/{version}/{phone_id}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": _normalize_msisdn(to_msisdn),
        "type": "text",
        "text": {"body": (text or "")[:4096]},
    }
    try:
        r = requests.post(url, json=payload, headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }, timeout=15)
        ok = r.status_code < 400
        return ok, (r.json() if r.headers.get("content-type", "").startswith("application/json") else {"status": r.status_code, "body": r.text})
    except requests.RequestException as e:
        return False, {"error": str(e)}


def handle_inbound_payload(payload):
    """Walk a Meta webhook body and reply to every user-text message in it.

    Meta delivers batched 'entry/changes/value/messages' arrays. We process
    text messages only; anything else we ack silently (Meta retries otherwise).
    """
    replied = 0
    for entry in payload.get("entry", []) or []:
        for change in entry.get("changes", []) or []:
            value = change.get("value") or {}
            for msg in value.get("messages", []) or []:
                if msg.get("type") != "text":
                    continue
                from_msisdn = msg.get("from") or ""
                text = (msg.get("text") or {}).get("body") or ""
                if not text.strip():
                    continue
                _process_question(from_msisdn, text.strip())
                replied += 1
    return replied


def _process_question(from_msisdn, question):
    user = _resolve_user(from_msisdn)
    actor = user or _bot_user()
    try:
        result = ask(question, user=actor, language="auto")
        answer = result.get("answer") or "Sorry, I couldn't generate a reply."
        if result.get("error"):
            answer = f"(error: {result['error']})\n\n{answer}".strip()
    except Exception as e:
        logger.exception("WhatsApp chatbot ask() failed")
        result = {"tools_used": [], "tokens": 0, "latency_ms": 0, "error": str(e)}
        answer = "Sorry, I'm having trouble right now. Please try again later."

    ok, resp = send_text(from_msisdn, answer)
    if not ok:
        logger.error("WhatsApp send failed: %s", resp)

    # Always log so the audit/history view sees WhatsApp traffic.
    try:
        ChatbotLog.objects.create(
            user=actor if actor and actor.is_authenticated else None,
            question=f"[whatsapp:{from_msisdn}] {question}",
            answer=answer,
            tools_used=result.get("tools_used", []),
            tokens=result.get("tokens", 0),
            latency_ms=result.get("latency_ms", 0),
            error=result.get("error", "") or ("" if ok else json.dumps(resp)[:500]),
        )
    except Exception:
        logger.exception("Failed to write ChatbotLog for WhatsApp message")


_BOT_USER_USERNAME = "_whatsapp_bot"


def _bot_user():
    """Lazily create a stub user so chatbot tools that require auth still work
    when the sender isn't a known employee."""
    user, _ = User.objects.get_or_create(
        username=_BOT_USER_USERNAME,
        defaults={"first_name": "WhatsApp", "last_name": "Bot", "is_active": False},
    )
    return user
