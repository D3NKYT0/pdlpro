from decimal import Decimal

from django.conf import settings
from django.db import models, transaction

from common.models import BaseModel


class Wallet(BaseModel):
    """Carteira única do usuário com saldos separados de moedas principais e bônus.

    Relaciona os registros por ``user``. Herda BaseModel: use ``id`` (UUID) nas APIs;
    ``pk``/``seq_id`` são internos. Use os serviços de aplicação para operações de negócio,
    mantendo neste modelo as regras de persistência e os relacionamentos.
    """

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="wallet")
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    bonus_balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))

    class Meta:
        verbose_name = "Carteira"
        verbose_name_plural = "Carteiras"

    def __str__(self) -> str:
        return f"Carteira de {self.user}"


class WalletTransaction(BaseModel):
    """Entrada ou saída de moedas usada para compor o extrato da carteira.

    Relaciona os registros por ``wallet``. Herda BaseModel: use ``id`` (UUID) nas APIs;
    ``pk``/``seq_id`` são internos. Use os serviços de aplicação para operações de negócio,
    mantendo neste modelo as regras de persistência e os relacionamentos.
    """

    class Kind(models.TextChoices):
        """Valores aceitos para Kind em WalletTransaction.

        Use as constantes desta enumeração ao atribuir o campo; o primeiro valor de cada opção é
        persistido e o rótulo é usado na apresentação.
        """

        CREDIT = "ENTRADA", "Entrada"
        DEBIT = "SAIDA", "Saída"

    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name="transactions")
    kind = models.CharField(max_length=10, choices=Kind.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField(blank=True)
    origin = models.CharField(max_length=100, blank=True)
    destination = models.CharField(max_length=100, blank=True)

    class Meta:
        verbose_name = "Transação"
        verbose_name_plural = "Transações"


class CoinConfig(BaseModel):
    """Configuração da moeda do jogo, conversões e taxa de retirada para o painel. Herda BaseModel:
    use ``id`` (UUID) nas APIs; ``pk``/``seq_id`` são internos. Use os serviços de aplicação
    para operações de negócio, mantendo neste modelo as regras de persistência e os
    relacionamentos.
    """

    name = models.CharField(max_length=100)
    coin_id = models.PositiveIntegerField(default=57)
    multiplier = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("1.00"))
    usd_multiplier = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("5.00"))
    active = models.BooleanField(default=True)
    withdraw_fee_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.00"))

    class Meta:
        verbose_name = "Configuração de moeda"
        verbose_name_plural = "Configurações de moeda"

    def save(self, *args, **kwargs):
        with transaction.atomic():
            if self.active:
                CoinConfig.objects.exclude(pk=self.pk).update(active=False)
            super().save(*args, **kwargs)


class CoinPurchaseBonus(BaseModel):
    """Faixa de quantidade de moedas e percentual usados para calcular bônus de compra. Herda
    BaseModel: use ``id`` (UUID) nas APIs; ``pk``/``seq_id`` são internos. Use os serviços de
    aplicação para operações de negócio, mantendo neste modelo as regras de persistência e os
    relacionamentos.
    """

    min_amount = models.DecimalField(max_digits=12, decimal_places=2)
    max_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    percent = models.DecimalField(max_digits=5, decimal_places=2)
    description = models.CharField(max_length=200)
    active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Bônus de compra"
        verbose_name_plural = "Bônus de compra"
        ordering = ["order", "min_amount"]

    def __str__(self) -> str:
        return self.description


class CoinPackage(BaseModel):
    """Pacote comercial de moedas com preços em BRL/USD e estado de disponibilidade. Herda
    BaseModel: use ``id`` (UUID) nas APIs; ``pk``/``seq_id`` são internos. Use os serviços de
    aplicação para operações de negócio, mantendo neste modelo as regras de persistência e os
    relacionamentos.
    """

    code = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=80)
    coins = models.DecimalField(max_digits=12, decimal_places=2)
    price_brl = models.DecimalField(max_digits=12, decimal_places=2)
    price_usd = models.DecimalField(max_digits=12, decimal_places=2)
    badge = models.CharField(max_length=40, blank=True)
    active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Pacote de moedas"
        verbose_name_plural = "Pacotes de moedas"
        ordering = ["sort_order", "coins"]

    def __str__(self) -> str:
        return self.name
