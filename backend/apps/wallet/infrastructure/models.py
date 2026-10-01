from decimal import Decimal

from django.conf import settings
from django.db import models, transaction
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

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
        verbose_name=_("Carteira")
        verbose_name_plural=_("Carteiras")

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

        CREDIT = "ENTRADA", _("Entrada")
        DEBIT = "SAIDA", _("Saída")

    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name="transactions")
    kind = models.CharField(max_length=10, choices=Kind.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField(blank=True)
    origin = models.CharField(max_length=100, blank=True)
    destination = models.CharField(max_length=100, blank=True)

    class Meta:
        verbose_name=_("Transação")
        verbose_name_plural=_("Transações")


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
        verbose_name=_("Configuração de moeda")
        verbose_name_plural=_("Configurações de moeda")

    def save(self, *args, **kwargs):
        with transaction.atomic():
            if self.active:
                CoinConfig.objects.exclude(pk=self.pk).update(active=False)
            super().save(*args, **kwargs)
            if self.active:
                WalletChargeCurrency.objects.update_or_create(
                    code="BRL",
                    defaults={"coins_per_unit": self.multiplier, "settlement": True, "enabled": True, "sort_order": 0},
                )
                if self.usd_multiplier is not None:
                    WalletChargeCurrency.objects.update_or_create(
                        code="USD",
                        defaults={"coins_per_unit": self.usd_multiplier, "settlement": False, "enabled": True, "sort_order": 1},
                    )


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
        verbose_name=_("Bônus de compra")
        verbose_name_plural=_("Bônus de compra")
        ordering = ["order", "min_amount"]

    def __str__(self) -> str:
        return self.description


class CoinPurchasePromo(BaseModel):
    """Campanha promocional de recarga: percentual mínimo de bônus em moedas e copy do banner.

    Quando vigente, eleva o piso do bônus de compra sem alterar o valor cobrado no gateway.
    No máximo uma campanha fica ``active=True`` por vez. Herda BaseModel: use ``id`` (UUID) nas
    APIs; ``pk``/``seq_id`` são internos.
    """

    percent = models.DecimalField(max_digits=5, decimal_places=2)
    title = models.CharField(max_length=120)
    description = models.CharField(max_length=240, blank=True)
    badge = models.CharField(max_length=60, blank=True, default="")
    stacking_mode = models.CharField(
        max_length=20,
        default="max",
        choices=[("max", _("Maior bônus")), ("sum", _("Cumulativo"))],
    )
    first_purchase_active = models.BooleanField(default=False)
    first_purchase_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.00"))
    pix_bonus_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.00"))
    active = models.BooleanField(default=True)
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name=_("Promoção de recarga")
        verbose_name_plural=_("Promoções de recarga")
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return f"{self.title} ({self.percent}%)"

    def save(self, *args, **kwargs):
        with transaction.atomic():
            if self.active:
                CoinPurchasePromo.objects.exclude(pk=self.pk).update(active=False)
            super().save(*args, **kwargs)

    def is_currently_active(self, *, at=None) -> bool:
        """Indica se a campanha está marcada ativa e dentro da janela de vigência."""

        if not self.active:
            return False
        moment = at or timezone.now()
        if self.starts_at and self.starts_at > moment:
            return False
        return not (self.ends_at and self.ends_at <= moment)

    @classmethod
    def current(cls, *, at=None):
        """Retorna a campanha ativa vigente no instante, ou ``None``."""

        moment = at or timezone.now()
        for promo in cls.objects.filter(active=True).order_by("-updated_at"):
            if promo.is_currently_active(at=moment):
                return promo
        return None


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
        verbose_name=_("Pacote de moedas")
        verbose_name_plural=_("Pacotes de moedas")
        ordering = ["sort_order", "coins"]

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.price_brl is not None and self.price_brl > 0:
            CoinPackagePrice.objects.update_or_create(
                package=self,
                currency_code="BRL",
                defaults={"amount": self.price_brl},
            )
        if self.price_usd is not None and self.price_usd > 0:
            CoinPackagePrice.objects.update_or_create(
                package=self,
                currency_code="USD",
                defaults={"amount": self.price_usd},
            )


class WalletChargeCurrency(BaseModel):
    """Moeda de cobrança disponível para a loja do servidor.

    ``code`` é a sigla ISO 4217 única em maiúsculas (BRL, USD, EUR).
    ``enabled`` indica se a moeda aparece no catálogo e na cotação.
    ``coins_per_unit`` é a taxa para compras de valor avulso (1 unidade compra X coins).
    ``sort_order`` define a ordem no seletor de moedas da carteira.
    ``settlement`` marca a moeda de liquidação (padrão e destino obrigatório no Brasil).
    No máximo uma moeda pode ter ``settlement=True``.
    """

    code = models.CharField(max_length=10, unique=True)
    enabled = models.BooleanField(default=True)
    coins_per_unit = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("1.00"))
    sort_order = models.PositiveIntegerField(default=0)
    settlement = models.BooleanField(default=False)

    class Meta:
        db_table = "wallet_charge_currency"
        verbose_name = _("Moeda de cobrança")
        verbose_name_plural = _("Moedas de cobrança")
        ordering = ["sort_order", "code"]

    def __str__(self) -> str:
        return f"{self.code} ({self.coins_per_unit})"

    def save(self, *args, **kwargs):
        self.code = (self.code or "").strip().upper()
        with transaction.atomic():
            if self.settlement:
                WalletChargeCurrency.objects.exclude(pk=self.pk).update(settlement=False)
            super().save(*args, **kwargs)
            if self.code == "BRL":
                CoinConfig.objects.filter(active=True).update(multiplier=self.coins_per_unit)
            elif self.code == "USD":
                CoinConfig.objects.filter(active=True).update(usd_multiplier=self.coins_per_unit)


class CoinPackagePrice(BaseModel):
    """Preço comercial de um pacote de moedas em uma moeda de cobrança específica.

    Relaciona com ``CoinPackage`` e armazena o valor decimal maior que zero.
    """

    package = models.ForeignKey(CoinPackage, on_delete=models.CASCADE, related_name="prices")
    currency_code = models.CharField(max_length=10)
    amount = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = "wallet_coin_package_price"
        unique_together = [("package", "currency_code")]
        verbose_name = _("Preço de pacote de moedas")
        verbose_name_plural = _("Preços de pacotes de moedas")
        ordering = ["currency_code"]

    def __str__(self) -> str:
        return f"{self.package.name} - {self.currency_code} {self.amount}"

    def save(self, *args, **kwargs):
        self.currency_code = (self.currency_code or "").strip().upper()
        super().save(*args, **kwargs)
        if self.currency_code == "BRL":
            CoinPackage.objects.filter(pk=self.package_id).update(price_brl=self.amount)
        elif self.currency_code == "USD":
            CoinPackage.objects.filter(pk=self.package_id).update(price_usd=self.amount)

