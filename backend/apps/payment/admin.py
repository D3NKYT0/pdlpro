from django.contrib import admin

from apps.payment.infrastructure.models import (
    PaymentAttempt,
    PaymentReversal,
    PedidoPagamento,
    WebhookLog,
)
from common.admin import PDLModelAdmin


class _ReadOnlyInline(admin.TabularInline):
    """Histórico financeiro: visível no pedido, nunca editável pelo admin."""

    extra = 0
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False


class PaymentAttemptInline(_ReadOnlyInline):
    """Tentativas de cobrança do pedido, com chave de idempotência e referência externa."""

    model = PaymentAttempt
    fields = readonly_fields = ("number", "status", "external_id", "idempotency_key", "created_at")


class PaymentReversalInline(_ReadOnlyInline):
    """Estornos, chargebacks e disputas já conciliados com a carteira."""

    model = PaymentReversal
    fields = readonly_fields = (
        "kind", "refunded_total", "coins_debited", "bonus_debited", "shortfall", "event_key", "created_at",
    )


@admin.register(PedidoPagamento)
class PedidoPagamentoAdmin(PDLModelAdmin):
    """Configura a administração Django de ``PedidoPagamento``.

    A listagem exibe ``id``, ``user``, ``amount``, ``currency``, ``coins``, ``method``,
    ``status``, ``created_at``. Ajuste filtros, busca e campos nesta classe para mudar a
    experiência da equipe no admin; regras reutilizáveis ficam na aplicação.
    """

    list_display = ("id", "user", "amount", "currency", "coins", "method", "status", "review_status", "created_at")
    list_filter = ("status", "review_status", "method", "currency")
    search_fields = ("user__username", "external_id", "attempts__external_id")
    readonly_fields = (
        "id", "created_at", "updated_at", "refunded_amount", "coins_reversed", "bonus_reversed", "reversal_shortfall",
    )
    inlines = (PaymentAttemptInline, PaymentReversalInline)


@admin.register(WebhookLog)
class WebhookLogAdmin(PDLModelAdmin):
    """Configura a administração Django de ``WebhookLog``.

    A listagem exibe ``kind``, ``data_id``, ``created_at``. Ajuste filtros, busca e campos nesta
    classe para mudar a experiência da equipe no admin; regras reutilizáveis ficam na aplicação.
    """

    list_display = ("kind", "data_id", "created_at")
    list_filter = ("kind", "created_at")
    search_fields = ("kind", "data_id")
    readonly_fields = ("id", "kind", "data_id", "payload", "created_at", "updated_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
