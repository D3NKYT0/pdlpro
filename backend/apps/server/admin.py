from django.contrib import admin

from apps.server.infrastructure.models import ManagedLineageAccount, ServicePrice


@admin.register(ManagedLineageAccount)
class ManagedLineageAccountAdmin(admin.ModelAdmin):
    list_display = ("login", "user", "is_primary", "created_at")
    search_fields = ("login", "user__username")


@admin.register(ServicePrice)
class ServicePriceAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "price", "active")
