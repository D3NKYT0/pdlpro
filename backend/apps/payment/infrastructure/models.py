from django.db import models

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

        PENDING = "pending", "Pendente"
        PROCESSING = "processing", "Processando"
        CONFIRMED = "confirmed", "Confirmado"
        CANCELLED = "cancelled", "Cancelado"
        FAILED = "failed", "Falhou"

    class Currency(models.TextChoices):
        """Valores aceitos para Currency em PedidoPagamento.

        Use as constantes desta enumeração ao atribuir o campo; o primeiro valor de cada opção é
        persistido e o rótulo é usado na apresentação.
        """

        BRL = "BRL", "Real"
        USD = "USD", "Dólar"

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

    class Meta:
        verbose_name = "Pedido de pagamento"
        verbose_name_plural = "Pedidos de pagamento"
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
        verbose_name = "Log de webhook"
        verbose_name_plural = "Logs de webhook"
