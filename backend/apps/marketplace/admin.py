from django.contrib import admin

from apps.marketplace.infrastructure.models import CharacterListing
from common.admin import PDLModelAdmin


@admin.register(CharacterListing)
class CharacterListingAdmin(PDLModelAdmin):
    list_display = ("char_name", "seller", "price", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("char_name", "seller__username")
