from django.urls import path

from apps.auction.presentation.views.customer import MyAuctionsView, PlaceBidView

urlpatterns = [
    path("", MyAuctionsView.as_view(), name="customer-auctions"),
    path("<uuid:auction_id>/bid/", PlaceBidView.as_view(), name="customer-auctions-bid"),
]
