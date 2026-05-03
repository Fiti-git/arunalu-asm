from django.urls import path

from .whatsapp_views import webhook

urlpatterns = [
    path("", webhook, name="whatsapp-webhook"),
]
