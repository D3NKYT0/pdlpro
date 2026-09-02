from django.urls import path
from apps.server.presentation.views.item_catalog import ItemCatalogView

from apps.server.presentation.views.public import PublicLineageQueryView, RankingView, ServerInfoView, ServerStatusView

urlpatterns = [
    path("items/catalog/", ItemCatalogView.as_view(), name="public-item-catalog"),
    path("server/info/", ServerInfoView.as_view(), name="public-server-info"),
    path("server/status/", ServerStatusView.as_view(), name="public-server-status"),
    path("server/rankings/<str:kind>/", RankingView.as_view(), name="public-server-ranking"),
    path("server/world/<str:name>/", PublicLineageQueryView.as_view(), name="public-server-world"),
]
