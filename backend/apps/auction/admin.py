from django.contrib import admin

from apps.auction.infrastructure.models import Auction, Bid
from common.admin import PDLModelAdmin


@admin.register(Auction)
class AuctionAdmin(PDLModelAdmin):
    list_display = ("item_name", "seller", "min_bid", "current_bid", "status", "ends_at")
    list_filter = ("status",)


@admin.register(Bid)
class BidAdmin(PDLModelAdmin):
    list_display = ("auction", "bidder", "amount", "created_at")
