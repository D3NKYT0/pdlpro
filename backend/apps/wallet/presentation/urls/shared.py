from django.urls import path

from apps.wallet.presentation.views.shared import WalletTransactionsView, WalletTransferView, WalletView

urlpatterns = [
    path("", WalletView.as_view(), name="shared-wallet"),
    path("transfer/", WalletTransferView.as_view(), name="shared-wallet-transfer"),
    path("transactions/", WalletTransactionsView.as_view(), name="shared-wallet-transactions"),
]
