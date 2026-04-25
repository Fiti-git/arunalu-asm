from django.contrib.auth.models import User
from django.db import models


class ChatbotLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    question = models.TextField()
    answer = models.TextField(blank=True)
    tools_used = models.JSONField(default=list, blank=True)
    tokens = models.IntegerField(default=0)
    latency_ms = models.IntegerField(default=0)
    error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "-created_at"])]

    def __str__(self):
        return f"{self.user_id} @ {self.created_at:%Y-%m-%d %H:%M}"
