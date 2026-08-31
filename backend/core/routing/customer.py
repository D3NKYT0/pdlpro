from django.urls import include, path

urlpatterns = [
    path("server/", include("apps.server.presentation.urls.customer")),
    path("inventory/", include("apps.inventory.presentation.urls.customer")),
    path("payments/", include("apps.payment.presentation.urls.customer")),
    path("marketplace/", include("apps.marketplace.presentation.urls.customer")),
    path("auctions/", include("apps.auction.presentation.urls.customer")),
    path("notifications/", include("apps.communication.presentation.urls.customer")),
    path("friends/", include("apps.communication.presentation.urls.friends")),
    path("messages/", include("apps.communication.presentation.urls.messages")),
    path("games/", include("apps.games.presentation.urls.customer")),
    path("clans/", include("apps.clans.presentation.urls.customer")),
    path("social/", include("apps.social.presentation.urls.customer")),
]
