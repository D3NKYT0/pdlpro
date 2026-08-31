from django.contrib import admin

from apps.payment.infrastructure.models import PedidoPagamento, WebhookLog


@admin.register(PedidoPagamento)
class PedidoPagamentoAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "amount", "method", "status", "created_at")
    list_filter = ("status", "method")
    search_fields = ("user__username", "external_id")
    readonly_fields = ("id", "created_at", "updated_at")


@admin.register(WebhookLog)
class WebhookLogAdmin(admin.ModelAdmin):
    list_display = ("kind", "data_id", "created_at")
