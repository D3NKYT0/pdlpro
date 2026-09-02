from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from common.models import BaseModel


class Supporter(BaseModel):
    """Cadastro de apoiador associado a um usuário, com revisão e percentual de comissão.

    Relaciona os registros por ``user``. Herda BaseModel: use ``id`` (UUID) nas APIs;
    ``pk``/``seq_id`` são internos. Use os serviços de aplicação para operações de negócio,
    mantendo neste modelo as regras de persistência e os relacionamentos.
    """

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    channel_url = models.URLField()
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to="supporters/", blank=True)
    status = models.CharField(
        max_length=20,
        choices=[(s, s) for s in ("pending", "approved", "rejected")],
        default="pending",
    )
    review_note = models.TextField(blank=True)
    commission_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )


class Commission(BaseModel):
    """Comissão de uma compra da loja, vinculada ao apoiador e a um repasse quando solicitado.

    Relaciona os registros por ``supporter``, ``purchase``, ``payout``. Herda BaseModel: use
    ``id`` (UUID) nas APIs; ``pk``/``seq_id`` são internos. Use os serviços de aplicação para
    operações de negócio, mantendo neste modelo as regras de persistência e os relacionamentos.
    """

    supporter = models.ForeignKey(
        Supporter, on_delete=models.PROTECT, related_name="commissions"
    )
    purchase = models.OneToOneField("shop.ShopPurchase", on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payout = models.ForeignKey(
        "CommissionPayout",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="commissions",
    )


class CommissionPayout(BaseModel):
    """Solicitação de repasse que agrupa comissões de um apoiador e acompanha sua aprovação.

    Relaciona os registros por ``supporter``. Herda BaseModel: use ``id`` (UUID) nas APIs;
    ``pk``/``seq_id`` são internos. Use os serviços de aplicação para operações de negócio,
    mantendo neste modelo as regras de persistência e os relacionamentos.
    """

    supporter = models.ForeignKey(
        Supporter, on_delete=models.PROTECT, related_name="payouts"
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(
        max_length=20,
        choices=[(s, s) for s in ("pending", "paid", "rejected")],
        default="pending",
    )
    note = models.CharField(max_length=300, blank=True)


class RoadmapEntry(BaseModel):
    """Entrega planejada ou concluída com progresso e publicação no roadmap público. Herda
    BaseModel: use ``id`` (UUID) nas APIs; ``pk``/``seq_id`` são internos. Use os serviços de
    aplicação para operações de negócio, mantendo neste modelo as regras de persistência e os
    relacionamentos.
    """

    title = models.CharField(max_length=160)
    description = models.TextField()
    category = models.CharField(max_length=60, default="Servidor")
    status = models.CharField(
        max_length=20,
        choices=[
            ("planned", "Planejado"),
            ("progress", "Em andamento"),
            ("completed", "Concluído"),
        ],
        default="planned",
    )
    progress = models.PositiveIntegerField(
        default=0, validators=[MaxValueValidator(100)]
    )
    target_date = models.DateField(null=True, blank=True)
    published = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "-created_at"]


class SystemResource(BaseModel):
    """Chave de ativação de funcionalidade consultada pelo ResourceGateMiddleware. Herda BaseModel:
    use ``id`` (UUID) nas APIs; ``pk``/``seq_id`` são internos. Use os serviços de aplicação
    para operações de negócio, mantendo neste modelo as regras de persistência e os
    relacionamentos.
    """

    code = models.SlugField(unique=True)
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=60)
    enabled = models.BooleanField(default=True)
    description = models.CharField(max_length=250, blank=True)

    class Meta:
        ordering = ["category", "name"]
