from django.urls import path

from apps.inventory.presentation.views.customer import (
    CharacterItemsView,
    DepositItemView,
    InventoryDashboardView,
    TradeItemView,
    WithdrawItemView,
)

urlpatterns = [
    path("", InventoryDashboardView.as_view(), name="customer-inventory"),
    path("withdraw/", WithdrawItemView.as_view(), name="customer-inventory-withdraw"),
    path("deposit/", DepositItemView.as_view(), name="customer-inventory-deposit"),
    path("trade/", TradeItemView.as_view(), name="customer-inventory-trade"),
    path("characters/<int:char_id>/items/", CharacterItemsView.as_view(), name="customer-inventory-char-items"),
]
