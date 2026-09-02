from django.urls import include, path
from apps.wallet.presentation.views.exchange import GameExchangeView
from apps.shop.presentation.commerce import CommerceView, StaffCommerceView
from apps.games.presentation.advanced import (
    BattleDetailsView,
    DailyDetailsView,
    FishingDetailsView,
    GameStatisticsView,
    StaffGameContentView,
)

urlpatterns = [
    path("shared/wallet/game-exchange/", GameExchangeView.as_view()),
    path("customer/games/battle-pass/details/", BattleDetailsView.as_view()),
    path("customer/games/daily-bonus/details/", DailyDetailsView.as_view()),
    path("customer/games/fishing/details/", FishingDetailsView.as_view()),
    path("customer/games/statistics/<str:kind>/", GameStatisticsView.as_view()),
    path("staff/game-content/<str:kind>/", StaffGameContentView.as_view()),
    path(
        "staff/game-content/<str:kind>/<uuid:entry_id>/", StaffGameContentView.as_view()
    ),
    path("shared/shop/commerce/<str:section>/", CommerceView.as_view()),
    path("staff/commerce/<str:section>/", StaffCommerceView.as_view()),
    path("staff/commerce/<str:section>/<uuid:entry_id>/", StaffCommerceView.as_view()),
    path("", include("apps.programs.urls")),
    path("auth/", include("core.routing.auth")),
    path("public/", include("core.routing.public")),
    path("shared/", include("core.routing.shared")),
    path("customer/", include("core.routing.customer")),
    path("staff/", include("core.routing.staff")),
    path("system/", include("core.routing.system")),
]
