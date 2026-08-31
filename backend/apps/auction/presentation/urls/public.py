from django.urls import path

from apps.auction.presentation.views.customer import PublicAuctionListView

urlpatterns = [
    path("auctions/", PublicAuctionListView.as_view(), name="public-auctions"),
]
