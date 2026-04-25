from django.urls import path

from . import views

urlpatterns = [
    path("ask/", views.ask_view, name="chatbot-ask"),
    path("history/", views.history_view, name="chatbot-history"),
]
