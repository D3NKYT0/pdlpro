from django.urls import path

from apps.server.presentation.views.item_catalog import ItemCatalogView
from apps.server.presentation.views.public import (
    GameStoresView,
    PublicLineageQueryView,
    RankingView,
    ServerInfoView,
    ServerStatusView,
)
from apps.server.presentation.views.site_metadata import RobotsView, SiteMetadataView

urlpatterns = [
    path("server/robots/", RobotsView.as_view(), name="public-site-robots"),
    path("server/metadata/", SiteMetadataView.as_view(), name="public-site-metadata"),
    path("items/catalog/", ItemCatalogView.as_view(), name="public-item-catalog"),
    path("server/info/", ServerInfoView.as_view(), name="public-server-info"),
    path("server/status/", ServerStatusView.as_view(), name="public-server-status"),
    path("server/rankings/<str:kind>/", RankingView.as_view(), name="public-server-ranking"),
    path("server/world/<str:name>/", PublicLineageQueryView.as_view(), name="public-server-world"),
    path("server/stores/", GameStoresView.as_view(), name="public-server-stores"),
]
