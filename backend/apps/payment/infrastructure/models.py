from django.db import models

from common.models import BaseModel


class PedidoPagamento(BaseModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pendente"
        CONFIRMED = "confirmed", "Confirmado"
        CANCELLED = "cancelled", "Cancelado"
        FAILED = "failed", "Falhou"

    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="payment_orders")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    coins = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    method = models.CharField(max_length=20, default="mock")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    external_id = models.CharField(max_length=120, blank=True)
    checkout_url = models.CharField(max_length=500, blank=True)
    bonus_applied = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_credited = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        verbose_name = "Pedido de pagamento"
        verbose_name_plural = "Pedidos de pagamento"
        ordering = ["-created_at"]


class WebhookLog(BaseModel):
    kind = models.CharField(max_length=100)
    data_id = models.CharField(max_length=120)
    payload = models.JSONField(default=dict)

    class Meta:
        verbose_name = "Log de webhook"
        verbose_name_plural = "Logs de webhook"
