from django.urls import path

from apps.marketplace.presentation.views.customer import CancelListingView, MyListingsView, PurchaseListingView

urlpatterns = [
    path("", MyListingsView.as_view(), name="customer-marketplace"),
    path("<uuid:listing_id>/buy/", PurchaseListingView.as_view(), name="customer-marketplace-buy"),
    path("<uuid:listing_id>/cancel/", CancelListingView.as_view(), name="customer-marketplace-cancel"),
]
