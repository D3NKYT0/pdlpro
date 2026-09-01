from django.contrib import admin

from apps.payment.infrastructure.models import PedidoPagamento, WebhookLog
from common.admin import PDLModelAdmin


@admin.register(PedidoPagamento)
class PedidoPagamentoAdmin(PDLModelAdmin):
    list_display = ("id", "user", "amount", "currency", "coins", "method", "status", "created_at")
    list_filter = ("status", "method", "currency")
    search_fields = ("user__username", "external_id")
    readonly_fields = ("id", "created_at", "updated_at")


@admin.register(WebhookLog)
class WebhookLogAdmin(PDLModelAdmin):
    list_display = ("kind", "data_id", "created_at")
