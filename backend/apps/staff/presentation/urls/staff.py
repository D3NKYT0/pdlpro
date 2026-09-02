from django.urls import path
from apps.staff.presentation.views.accounts import StaffInspectGameAccountView, StaffUnlinkGameAccountView
from apps.staff.presentation.views.financial_reports import (
    BalanceReportView, CashFlowReportView, PaymentReportView, ReconciliationReportView,
)
from apps.staff.presentation.views.custom_items import CustomItemsView, CustomItemDetailView
from apps.staff.presentation.views.item_observation import (
    ObservationAccessView, ObservationLiveView, ObservationFavoriteView, ObservationSnapshotsView,
    ObservationSnapshotView, ObservationComparisonView, ObservationCategoriesView, ObservationCategoryView,
)

from apps.staff.presentation.views.config import (
    StaffCoinConfigView,
    StaffGamesView,
    StaffNewsView,
    StaffPanelSettingsView,
    StaffServicePricesView,
    StaffShopItemsView,
)

urlpatterns = [
    path("financial-reports/balances/", BalanceReportView.as_view(), name="staff-report-balances"),
    path("financial-reports/cash-flow/", CashFlowReportView.as_view(), name="staff-report-cash-flow"),
    path("financial-reports/payments/", PaymentReportView.as_view(), name="staff-report-payments"),
    path("financial-reports/reconciliation/", ReconciliationReportView.as_view(), name="staff-report-reconciliation"),
    path("custom-items/", CustomItemsView.as_view(), name="staff-custom-items"),
    path("custom-items/<uuid:item_uuid>/", CustomItemDetailView.as_view(), name="staff-custom-item-detail"),
    path("item-observation/access/", ObservationAccessView.as_view()),
    path("item-observation/", ObservationLiveView.as_view()),
    path("item-observation/favorites/<int:item_id>/", ObservationFavoriteView.as_view()),
    path("item-observation/snapshots/", ObservationSnapshotsView.as_view()),
    path("item-observation/snapshots/<uuid:snapshot_id>/", ObservationSnapshotView.as_view()),
    path("item-observation/compare/", ObservationComparisonView.as_view()),
    path("item-observation/categories/", ObservationCategoriesView.as_view()),
    path("item-observation/categories/<uuid:category_id>/", ObservationCategoryView.as_view()),
    path("accounts/", StaffInspectGameAccountView.as_view(), name="staff-accounts-inspect"),
    path("accounts/unlink/", StaffUnlinkGameAccountView.as_view(), name="staff-accounts-unlink"),
    path("panel/", StaffPanelSettingsView.as_view(), name="staff-panel-settings"),
    path("services/", StaffServicePricesView.as_view(), name="staff-service-prices"),
    path("coins/", StaffCoinConfigView.as_view(), name="staff-coins"),
    path("shop/", StaffShopItemsView.as_view(), name="staff-shop"),
    path("news/", StaffNewsView.as_view(), name="staff-news"),
    path("games/", StaffGamesView.as_view(), name="staff-games"),
]
