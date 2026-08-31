from django.urls import path

from apps.server.presentation.views.public import PublicLineageQueryView, RankingView, ServerStatusView

urlpatterns = [
    path("server/status/", ServerStatusView.as_view(), name="public-server-status"),
    path("server/rankings/<str:kind>/", RankingView.as_view(), name="public-server-ranking"),
    path("server/world/<str:name>/", PublicLineageQueryView.as_view(), name="public-server-world"),
]
