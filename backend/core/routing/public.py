from django.urls import include, path

from apps.themes.presentation.urls import public_urlpatterns

urlpatterns = [
    *public_urlpatterns,
    path("", include("apps.server.presentation.urls.public")),
    path("", include("apps.content.presentation.urls.public")),
    path("", include("apps.marketplace.presentation.urls.public")),
    path("", include("apps.auction.presentation.urls.public")),
]
