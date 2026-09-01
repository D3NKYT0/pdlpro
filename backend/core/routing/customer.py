from django.urls import include, path

urlpatterns = [
    path("server/", include("apps.server.presentation.urls.customer")),
    path("inventory/", include("apps.inventory.presentation.urls.customer")),
    path("payments/", include("apps.payment.presentation.urls.customer")),
    path("marketplace/", include("apps.marketplace.presentation.urls.customer")),
    path("auctions/", include("apps.auction.presentation.urls.customer")),
    path("notifications/", include("apps.communication.presentation.urls.customer")),
    path("support/", include("apps.support.presentation.urls.customer")),
    path("push/", include("apps.communication.presentation.urls.push")),
    path("games/", include("apps.games.presentation.urls.customer")),
]
