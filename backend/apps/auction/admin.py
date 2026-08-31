from django.contrib import admin

from apps.auction.infrastructure.models import Auction


@admin.register(Auction)
class AuctionAdmin(admin.ModelAdmin):
    list_display = ("id", "created_at")
