from django.urls import path

from apps.payment.presentation.views.customer import (
    CancelPaymentOrderView,
    ConfirmPaymentOrderView,
    PaymentOrderListView,
    PreviewPaymentBonusView,
)

urlpatterns = [
    path("", PaymentOrderListView.as_view(), name="customer-payments"),
    path("preview/", PreviewPaymentBonusView.as_view(), name="customer-payments-preview"),
    path("<uuid:order_id>/cancel/", CancelPaymentOrderView.as_view(), name="customer-payments-cancel"),
    path("<uuid:order_id>/confirm/", ConfirmPaymentOrderView.as_view(), name="customer-payments-confirm"),
]
