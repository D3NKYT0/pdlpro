from django.contrib import admin

from apps.clans.infrastructure.models import ClanProfile


@admin.register(ClanProfile)
class ClanProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "created_at")
