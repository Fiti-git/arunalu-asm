"""WhatsApp webhook endpoints.

GET  /api/whatsapp/webhook/  — Meta verification handshake.
POST /api/whatsapp/webhook/  — inbound user messages.
"""
import json
import logging

from django.conf import settings
from django.http import HttpResponse, HttpResponseForbidden, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from . import whatsapp as wa

logger = logging.getLogger(__name__)


@csrf_exempt
@require_http_methods(["GET", "POST"])
def webhook(request):
    if request.method == "GET":
        # Meta verification handshake.
        mode = request.GET.get("hub.mode")
        token = request.GET.get("hub.verify_token")
        challenge = request.GET.get("hub.challenge", "")
        expected = getattr(settings, "WHATSAPP_VERIFY_TOKEN", "")
        if mode == "subscribe" and token and expected and token == expected:
            return HttpResponse(challenge, content_type="text/plain")
        return HttpResponseForbidden("Verification failed.")

    raw = request.body or b""
    sig = request.headers.get("X-Hub-Signature-256", "")
    if not wa.verify_signature(raw, sig):
        return HttpResponseForbidden("Bad signature.")

    try:
        payload = json.loads(raw.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    try:
        replied = wa.handle_inbound_payload(payload)
    except Exception as e:
        logger.exception("WhatsApp handler error")
        return JsonResponse({"error": str(e)}, status=500)

    # Meta requires 200 quickly, so we always ack.
    return JsonResponse({"ok": True, "replied": replied})
