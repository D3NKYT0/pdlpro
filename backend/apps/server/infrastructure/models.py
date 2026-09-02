from uuid import uuid4

from django.conf import settings
from django.db import models

from common.models import BaseModel


class ManagedLineageAccount(BaseModel):
    """Referência local de uma conta Lineage vinculada, incluindo a indicação de conta principal.

    Relaciona os registros por ``user``. Herda BaseModel: use ``id`` (UUID) nas APIs;
    ``pk``/``seq_id`` são internos. Use os serviços de aplicação para operações de negócio,
    mantendo neste modelo as regras de persistência e os relacionamentos.
    """

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="lineage_accounts")
    login = models.CharField(max_length=45, db_index=True)
    is_primary = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Conta Lineage"
        verbose_name_plural = "Contas Lineage"
        unique_together = ("user", "login")

    def __str__(self) -> str:
        return f"{self.user} → {self.login}"


class AccountLinkSlot(BaseModel):
    """Capacidade adicional de vínculos de contas adquirida pelo usuário.

    Relaciona os registros por ``user``. Herda BaseModel: use ``id`` (UUID) nas APIs;
    ``pk``/``seq_id`` são internos. Use os serviços de aplicação para operações de negócio,
    mantendo neste modelo as regras de persistência e os relacionamentos.
    """

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="link_slots")
    extra_slots = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Slot de vínculo"
        verbose_name_plural = "Slots de vínculo"


class ServicePrice(BaseModel):
    """Preço e ativação de um serviço de personagem identificado por código. Herda BaseModel: use
    ``id`` (UUID) nas APIs; ``pk``/``seq_id`` são internos. Use os serviços de aplicação para
    operações de negócio, mantendo neste modelo as regras de persistência e os relacionamentos.
    """

    code = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=80)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Preço de serviço"
        verbose_name_plural = "Preços de serviço"

    def __str__(self) -> str:
        return self.name


class IndexConfig(BaseModel):
    """Configuração de apresentação do servidor e do painel selecionada pelos serviços de
    configuração. Herda BaseModel: use ``id`` (UUID) nas APIs; ``pk``/``seq_id`` são internos.
    Use os serviços de aplicação para operações de negócio, mantendo neste modelo as regras de
    persistência e os relacionamentos.
    """

    public_id = models.UUIDField(default=uuid4, editable=False, unique=True)
    slogan = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True)
    name = models.CharField(max_length=120, blank=True)
    description = models.TextField(blank=True)
    chronicle = models.CharField(max_length=80, blank=True)
    rates = models.JSONField(default=dict, blank=True)
    enchant = models.JSONField(default=dict, blank=True)
    max_level = models.PositiveIntegerField(default=80)
    features = models.JSONField(default=list, blank=True)
    notes = models.JSONField(default=dict, blank=True)
    coming_soon = models.BooleanField(default=False)
    staff_only_login = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Configuração do painel"
        verbose_name_plural = "Configurações do painel"

    def __str__(self) -> str:
        return self.name or self.slogan or "Configuração do painel"
