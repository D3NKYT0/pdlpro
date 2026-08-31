from django.urls import path

from apps.games.presentation.views.customer import BagView, BuyTokensView, DailyBonusView, RouletteView

urlpatterns = [
    path("roulette/", RouletteView.as_view(), name="customer-games-roulette"),
    path("tokens/", BuyTokensView.as_view(), name="customer-games-tokens"),
    path("daily-bonus/", DailyBonusView.as_view(), name="customer-games-daily-bonus"),
    path("bag/", BagView.as_view(), name="customer-games-bag"),
]
