from django.urls import path

from apps.staff.presentation.views.config import (
    StaffCoinConfigView,
    StaffGamesView,
    StaffNewsView,
    StaffPanelSettingsView,
    StaffServicePricesView,
    StaffShopItemsView,
)

urlpatterns = [
    path("panel/", StaffPanelSettingsView.as_view(), name="staff-panel-settings"),
    path("services/", StaffServicePricesView.as_view(), name="staff-service-prices"),
    path("coins/", StaffCoinConfigView.as_view(), name="staff-coins"),
    path("shop/", StaffShopItemsView.as_view(), name="staff-shop"),
    path("news/", StaffNewsView.as_view(), name="staff-news"),
    path("games/", StaffGamesView.as_view(), name="staff-games"),
]
