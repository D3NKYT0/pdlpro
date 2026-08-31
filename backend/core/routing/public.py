from django.urls import include, path

urlpatterns = [
    path("", include("apps.server.presentation.urls.public")),
    path("", include("apps.content.presentation.urls.public")),
    path("", include("apps.marketplace.presentation.urls.public")),
    path("", include("apps.auction.presentation.urls.public")),
    path("", include("apps.clans.presentation.urls.public")),
    path("", include("apps.social.presentation.urls.public")),
]
