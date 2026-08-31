from django.urls import path

from apps.payment.presentation.views.webhooks import MercadoPagoWebhookView, StripeWebhookView
from apps.staff.presentation.views.system import HealthView, VersionView

urlpatterns = [
    path("health/", HealthView.as_view(), name="system-health"),
    path("version/", VersionView.as_view(), name="system-version"),
    path("webhooks/mercadopago/", MercadoPagoWebhookView.as_view(), name="system-webhook-mp"),
    path("webhooks/stripe/", StripeWebhookView.as_view(), name="system-webhook-stripe"),
]
