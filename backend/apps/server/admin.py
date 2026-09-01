from django.contrib import admin

from apps.server.infrastructure.models import ManagedLineageAccount, ServicePrice
from common.admin import PDLModelAdmin


@admin.register(ManagedLineageAccount)
class ManagedLineageAccountAdmin(PDLModelAdmin):
    list_display = ("login", "user", "is_primary", "created_at")
    search_fields = ("login", "user__username")


@admin.register(ServicePrice)
class ServicePriceAdmin(PDLModelAdmin):
    list_display = ("code", "name", "price", "active")
