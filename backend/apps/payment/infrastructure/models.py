from uuid import uuid4

from django.db import models
from django.utils.translation import gettext_lazy as _

from common.models import BaseModel


class PedidoPagamento(BaseModel):
    """Pedido de compra de moedas com estado local, referências do provedor e dados de crédito.

    Relaciona os registros por ``user``. Herda BaseModel: use ``id`` (UUID) nas APIs;
    ``pk``/``seq_id`` são internos. Use os serviços de aplicação para operações de negócio,
    mantendo neste modelo as regras de persistência e os relacionamentos.
    """

    class Status(models.TextChoices):
        """Valores aceitos para Status em PedidoPagamento.

        Use as constantes desta enumeração ao atribuir o campo; o primeiro valor de cada opção é
        persistido e o rótulo é usado na apresentação.
        """

        PENDING = "pending", _("Pendente")
        PROCESSING = "processing", _("Processando")
        CONFIRMED = "confirmed", _("Confirmado")
        CANCELLED = "cancelled", _("Cancelado")
        FAILED = "failed", _("Falhou")

    class Currency(models.TextChoices):
        """Valores aceitos para Currency em PedidoPagamento.

        Use as constantes desta enumeração ao atribuir o campo; o primeiro valor de cada opção é
        persistido e o rótulo é usado na apresentação.
        """

        BRL = "BRL", _("Real")
        USD = "USD", _("Dólar")

    class ReviewStatus(models.TextChoices):
        """Situação de revisão financeira do pedido após disputa ou estorno sem saldo."""

        NONE = "", _("Sem pendência")
        DISPUTE = "dispute", _("Disputa aberta")
        MANUAL_REVIEW = "manual_review", _("Revisão manual")

    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="payment_orders")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    coins = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, choices=Currency.choices, default=Currency.BRL)
    package_code = models.CharField(max_length=40, blank=True)
    method = models.CharField(max_length=20, default="mock")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    external_id = models.CharField(max_length=120, blank=True)
    checkout_url = models.CharField(max_length=500, blank=True)
    client_secret = models.CharField(max_length=500, blank=True)
    bonus_applied = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_credited = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    paid_at = models.DateTimeField(null=True, blank=True)
    gateway_data = models.JSONField(default=dict, blank=True)
    refunded_amount = models.DecimalField(_("Valor devolvido pelo provedor"), max_digits=12, decimal_places=2, default=0)
    coins_reversed = models.DecimalField(_("Moedas estornadas"), max_digits=12, decimal_places=2, default=0)
    bonus_reversed = models.DecimalField(_("Bônus estornado"), max_digits=12, decimal_places=2, default=0)
    reversal_shortfall = models.DecimalField(
        _("Saldo devedor do estorno"),
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text=_("Moedas e bônus já gastos que não puderam ser debitados no estorno."),
    )
    review_status = models.CharField(
        _("Revisão financeira"), max_length=20, choices=ReviewStatus.choices, blank=True, default=""
    )

    class Meta:
        verbose_name=_("Pedido de pagamento")
        verbose_name_plural=_("Pedidos de pagamento")
        ordering = ["-created_at"]


class WebhookLog(BaseModel):
    """Registro de recebimento e processamento de notificações de pagamento para auditoria. Herda
    BaseModel: use ``id`` (UUID) nas APIs; ``pk``/``seq_id`` são internos. Use os serviços de
    aplicação para operações de negócio, mantendo neste modelo as regras de persistência e os
    relacionamentos.
    """

    kind = models.CharField(max_length=100)
    data_id = models.CharField(max_length=120)
    payload = models.JSONField(default=dict)

    class Meta:
        verbose_name=_("Log de webhook")
        verbose_name_plural=_("Logs de webhook")


class PaymentAttempt(BaseModel):
    """Tentativa lógica de cobrança de um pedido, com chave de idempotência própria.

    Reenvios e timeouts da mesma tentativa reutilizam ``idempotency_key``; uma nova tentativa só
    nasce após rejeição definitiva. Referências externas antigas permanecem aqui para conciliar
    aprovações tardias. Use os serviços de aplicação para criar e encerrar tentativas.
    """

    class Status(models.TextChoices):
        """Estados de uma tentativa de cobrança."""

        PENDING = "pending", _("Pendente")
        APPROVED = "approved", _("Aprovada")
        REJECTED = "rejected", _("Rejeitada")

    order = models.ForeignKey(PedidoPagamento, on_delete=models.CASCADE, related_name="attempts")
    number = models.PositiveIntegerField()
    idempotency_key = models.UUIDField(default=uuid4, unique=True, editable=False)
    external_id = models.CharField(max_length=120, blank=True, db_index=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    class Meta:
        verbose_name = _("Tentativa de pagamento")
        verbose_name_plural = _("Tentativas de pagamento")
        ordering = ["order", "number"]
        constraints = [models.UniqueConstraint(fields=["order", "number"], name="payment_attempt_number_unique")]


class PaymentReversal(BaseModel):
    """Evento financeiro de estorno, chargeback ou disputa já conciliado com a carteira.

    ``event_key`` é único: o mesmo evento do provedor nunca é aplicado duas vezes. Os valores
    registram o total devolvido informado e o que foi efetivamente debitado ou ficou devedor.
    """

    class Kind(models.TextChoices):
        """Tipos de evento financeiro conciliado."""

        REFUND = "refund", _("Reembolso")
        CHARGEBACK = "chargeback", _("Chargeback")
        DISPUTE_OPENED = "dispute_opened", _("Disputa aberta")
        DISPUTE_WON = "dispute_won", _("Disputa ganha")
        DISPUTE_LOST = "dispute_lost", _("Disputa perdida")

    order = models.ForeignKey(PedidoPagamento, on_delete=models.CASCADE, related_name="reversals")
    event_key = models.CharField(max_length=200, unique=True)
    kind = models.CharField(max_length=20, choices=Kind.choices)
    refunded_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    coins_debited = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    bonus_debited = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    shortfall = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        verbose_name = _("Estorno de pagamento")
        verbose_name_plural = _("Estornos de pagamento")
        ordering = ["-created_at"]
