from django.contrib import admin

from apps.payment.infrastructure.models import PedidoPagamento


@admin.register(PedidoPagamento)
class PedidoPagamentoAdmin(admin.ModelAdmin):
    list_display = ("id", "created_at")
