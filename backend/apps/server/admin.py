from django.contrib import admin

from apps.server.infrastructure.models import IndexConfig, ManagedLineageAccount, ServicePrice
from common.admin import PDLModelAdmin


@admin.register(ManagedLineageAccount)
class ManagedLineageAccountAdmin(PDLModelAdmin):
    list_display = ("login", "user", "is_primary", "created_at")
    search_fields = ("login", "user__username")


@admin.register(ServicePrice)
class ServicePriceAdmin(PDLModelAdmin):
    list_display = ("code", "name", "price", "active")


@admin.register(IndexConfig)
class IndexConfigAdmin(PDLModelAdmin):
    list_display = ("name", "chronicle", "coming_soon", "is_active", "updated_at")
    fieldsets = (
        ("Identidade", {"fields": ("name", "slogan", "description", "chronicle", "is_active")}),
        ("Rates", {"fields": ("rates", "enchant", "max_level", "features", "notes")}),
        ("Acesso", {"fields": ("coming_soon", "staff_only_login")}),
    )
