from django.urls import path

from apps.communication.presentation.views.push import PushSubscriptionView, VapidPublicKeyView

urlpatterns = [
    path("vapid/", VapidPublicKeyView.as_view(), name="customer-push-vapid"),
    path("subscribe/", PushSubscriptionView.as_view(), name="customer-push-subscribe"),
]
