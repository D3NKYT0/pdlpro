from django.contrib import admin

from apps.clans.infrastructure.models import ClanApplication, ClanProfile


@admin.register(ClanProfile)
class ClanProfileAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "recruiting", "focus", "created_at")
    search_fields = ("name", "owner__username")


@admin.register(ClanApplication)
class ClanApplicationAdmin(admin.ModelAdmin):
    list_display = ("clan", "user", "char_name", "status", "created_at")
    list_filter = ("status",)
