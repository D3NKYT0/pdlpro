from django.urls import path

from .views import ValoremWikiStatusView

urlpatterns = [
    path("wiki/status/", ValoremWikiStatusView.as_view(), name="valorem-wiki-status"),
]
