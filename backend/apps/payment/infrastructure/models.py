from django.db import models

from common.models import BaseModel


class PedidoPagamento(BaseModel):
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="payment_orders")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    coins = models.PositiveIntegerField(default=0)
    method = models.CharField(max_length=20, default="mercadopago")
    status = models.CharField(max_length=20, default="pending")
    external_id = models.CharField(max_length=120, blank=True)

    class Meta:
        verbose_name = "Pedido de pagamento"
        verbose_name_plural = "Pedidos de pagamento"

