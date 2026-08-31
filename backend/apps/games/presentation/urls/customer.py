from django.urls import path

from apps.games.presentation.views.customer import (
    BagView,
    BoxListView,
    BuyTokensView,
    DailyBonusView,
    DiceView,
    MinigamesView,
    OpenBoxView,
    RouletteView,
    SlotsView,
)

urlpatterns = [
    path("roulette/", RouletteView.as_view(), name="customer-games-roulette"),
    path("tokens/", BuyTokensView.as_view(), name="customer-games-tokens"),
    path("daily-bonus/", DailyBonusView.as_view(), name="customer-games-daily-bonus"),
    path("bag/", BagView.as_view(), name="customer-games-bag"),
    path("boxes/", BoxListView.as_view(), name="customer-games-boxes"),
    path("boxes/<uuid:box_id>/open/", OpenBoxView.as_view(), name="customer-games-open-box"),
    path("minigames/", MinigamesView.as_view(), name="customer-games-minigames"),
    path("dice/", DiceView.as_view(), name="customer-games-dice"),
    path("slots/", SlotsView.as_view(), name="customer-games-slots"),
]
