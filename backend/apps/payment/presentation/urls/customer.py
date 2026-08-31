from django.urls import path

from apps.payment.presentation.views.customer import (
    CancelPaymentOrderView,
    ConfirmPaymentOrderView,
    PaymentCatalogView,
    PaymentOrderListView,
    PaymentOrderStatusView,
    PreviewPaymentBonusView,
    ProcessPaymentOrderView,
)

urlpatterns = [
    path("", PaymentOrderListView.as_view(), name="customer-payments"),
    path("catalog/", PaymentCatalogView.as_view(), name="customer-payments-catalog"),
    path("preview/", PreviewPaymentBonusView.as_view(), name="customer-payments-preview"),
    path("<uuid:order_id>/cancel/", CancelPaymentOrderView.as_view(), name="customer-payments-cancel"),
    path("<uuid:order_id>/confirm/", ConfirmPaymentOrderView.as_view(), name="customer-payments-confirm"),
    path("<uuid:order_id>/process/", ProcessPaymentOrderView.as_view(), name="customer-payments-process"),
    path("<uuid:order_id>/status/", PaymentOrderStatusView.as_view(), name="customer-payments-status"),
]
