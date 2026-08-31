from django.contrib import admin

from apps.marketplace.infrastructure.models import CharacterListing


@admin.register(CharacterListing)
class CharacterListingAdmin(admin.ModelAdmin):
    list_display = ("id", "created_at")
