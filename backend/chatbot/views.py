from datetime import timedelta

from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .llm import ask
from .models import ChatbotLog

RATE_LIMIT_PER_HOUR = 60


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ask_view(request):
    question = (request.data.get("question") or "").strip()
    language = (request.data.get("language") or "auto").lower()
    if language not in ("auto", "en", "si", "ta"):
        language = "auto"
    if not question:
        return Response({"error": "question is required"}, status=400)
    if len(question) > 1000:
        return Response({"error": "question too long (max 1000 chars)"}, status=400)

    one_hour_ago = timezone.now() - timedelta(hours=1)
    recent = ChatbotLog.objects.filter(user=request.user, created_at__gte=one_hour_ago).count()
    if recent >= RATE_LIMIT_PER_HOUR:
        return Response(
            {"error": f"Rate limit reached ({RATE_LIMIT_PER_HOUR}/hour). Try again later."},
            status=429,
        )

    result = ask(question, user=request.user, language=language)

    ChatbotLog.objects.create(
        user=request.user,
        question=question,
        answer=result.get("answer", ""),
        tools_used=result.get("tools_used", []),
        tokens=result.get("tokens", 0),
        latency_ms=result.get("latency_ms", 0),
        error=result.get("error", ""),
    )

    if result.get("error"):
        return Response(result, status=502)
    return Response(result)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def history_view(request):
    logs = ChatbotLog.objects.filter(user=request.user)[:30]
    return Response([
        {
            "id": l.id,
            "question": l.question,
            "answer": l.answer,
            "created_at": l.created_at.isoformat(),
        }
        for l in logs
    ])
