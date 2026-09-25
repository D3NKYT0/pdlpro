from django.urls import path

from apps.staff.presentation.views.accounts import (
    StaffInspectGameAccountView,
    StaffUnlinkGameAccountView,
)
from apps.staff.presentation.views.cms import (
    StaffCalendarView,
    StaffDownloadsView,
    StaffFaqView,
    StaffWikiView,
)
from apps.staff.presentation.views.config import (
    StaffCoinConfigView,
    StaffCoinPackagesView,
    StaffGamesAutoconfigView,
    StaffGamesView,
    StaffNewsView,
    StaffPanelSettingsView,
    StaffServicePricesView,
    StaffShopAutoconfigView,
    StaffShopItemsView,
    StaffWalletPromoView,
)
from apps.staff.presentation.views.custom_items import (
    CustomItemDetailView,
    CustomItemsView,
)
from apps.staff.presentation.views.financial_reports import (
    BalanceReportView,
    CashFlowReportView,
    PaymentReportView,
    ReconciliationReportView,
)
from apps.staff.presentation.views.item_observation import (
    ObservationAccessView,
    ObservationCategoriesView,
    ObservationCategoryView,
    ObservationComparisonView,
    ObservationFavoriteView,
    ObservationLiveView,
    ObservationSnapshotsView,
    ObservationSnapshotView,
)
from apps.staff.presentation.views.moderation import (
    StaffModerationActionView,
    StaffModerationCharactersView,
    StaffModerationCharacterView,
)
from apps.staff.presentation.views.notifications import StaffNotificationsView
from apps.staff.presentation.views.operational_reports import (
    AuctionsOperationalReportView,
    InventoryOperationalReportView,
    MarketplaceOperationalReportView,
    PurchasesOperationalReportView,
)
from apps.staff.presentation.views.payments import StaffConfirmMockPaymentView
from apps.staff.presentation.views.secrets import (
    StaffSecretsActionView,
    StaffSecretsApplyJobView,
    StaffSecretsStatusView,
)
from apps.themes.presentation.urls import staff_urlpatterns

urlpatterns = [
    *staff_urlpatterns,
    path("secrets/", StaffSecretsStatusView.as_view(), name="staff-secrets-status"),
    path("secrets/actions/", StaffSecretsActionView.as_view(), name="staff-secrets-actions"),
    path(
        "secrets/jobs/<uuid:job_id>/apply/",
        StaffSecretsApplyJobView.as_view(),
        name="staff-secrets-apply-job",
    ),
    path("financial-reports/balances/", BalanceReportView.as_view(), name="staff-report-balances"),
    path("financial-reports/cash-flow/", CashFlowReportView.as_view(), name="staff-report-cash-flow"),
    path("financial-reports/payments/", PaymentReportView.as_view(), name="staff-report-payments"),
    path("payments/<uuid:order_id>/confirm-mock/", StaffConfirmMockPaymentView.as_view(), name="staff-confirm-mock-payment"),
    path("financial-reports/reconciliation/", ReconciliationReportView.as_view(), name="staff-report-reconciliation"),
    path("operational-reports/inventory/", InventoryOperationalReportView.as_view(), name="staff-ops-inventory"),
    path("operational-reports/auctions/", AuctionsOperationalReportView.as_view(), name="staff-ops-auctions"),
    path("operational-reports/purchases/", PurchasesOperationalReportView.as_view(), name="staff-ops-purchases"),
    path("operational-reports/marketplace/", MarketplaceOperationalReportView.as_view(), name="staff-ops-marketplace"),
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
    path("moderation/characters/", StaffModerationCharactersView.as_view(), name="staff-moderation-characters"),
    path(
        "moderation/characters/<int:char_id>/",
        StaffModerationCharacterView.as_view(),
        name="staff-moderation-character",
    ),
    path("moderation/actions/", StaffModerationActionView.as_view(), name="staff-moderation-actions"),
    path("panel/", StaffPanelSettingsView.as_view(), name="staff-panel-settings"),
    path("services/", StaffServicePricesView.as_view(), name="staff-service-prices"),
    path("coins/", StaffCoinConfigView.as_view(), name="staff-coins"),
    path("coin-packages/", StaffCoinPackagesView.as_view(), name="staff-coin-packages"),
    path("wallet-promo/", StaffWalletPromoView.as_view(), name="staff-wallet-promo"),
    path("shop/autoconfig/", StaffShopAutoconfigView.as_view(), name="staff-shop-autoconfig"),
    path("shop/", StaffShopItemsView.as_view(), name="staff-shop"),
    path("news/", StaffNewsView.as_view(), name="staff-news"),
    path("calendar/", StaffCalendarView.as_view(), name="staff-calendar"),
    path("faq/", StaffFaqView.as_view(), name="staff-faq"),
    path("wiki/", StaffWikiView.as_view(), name="staff-wiki"),
    path("downloads/", StaffDownloadsView.as_view(), name="staff-downloads"),
    path("notifications/", StaffNotificationsView.as_view(), name="staff-notifications"),
    path("games/autoconfig/", StaffGamesAutoconfigView.as_view(), name="staff-games-autoconfig"),
    path("games/", StaffGamesView.as_view(), name="staff-games"),
]
