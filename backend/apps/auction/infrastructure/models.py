from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from common.models import BaseModel


class Auction(BaseModel):
    """Oferta em leilão (item do inventário ou personagem L2) com prazo e maior lance.

    Relaciona os registros por ``seller``, ``highest_bidder``. Herda BaseModel: use ``id``
    (UUID) nas APIs; ``pk``/``seq_id`` são internos. Use os serviços de aplicação para operações
    de negócio, mantendo neste modelo as regras de persistência e os relacionamentos.
    """

    class Status(models.TextChoices):
        """Valores aceitos para Status em Auction.

        Use as constantes desta enumeração ao atribuir o campo; o primeiro valor de cada opção é
        persistido e o rótulo é usado na apresentação.
        """

        OPEN = "open", _("Aberto")
        FINISHED = "finished", _("Finalizado")
        CANCELLED = "cancelled", _("Cancelado")

    class Kind(models.TextChoices):
        """Tipo de ativo leiloado."""

        ITEM = "item", _("Item")
        CHARACTER = "character", _("Personagem")

    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="auctions")
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.ITEM)
    item_id = models.PositiveIntegerField(null=True, blank=True)
    item_name = models.CharField(max_length=80, blank=True, default="")
    item_enchant = models.PositiveIntegerField(default=0)
    quantity = models.PositiveIntegerField(default=1)
    min_bid = models.DecimalField(max_digits=12, decimal_places=2)
    current_bid = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    highest_bidder = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="auction_winning_bids",
    )
    character_name = models.CharField(max_length=35, blank=True, default="")
    char_id = models.PositiveIntegerField(null=True, blank=True)
    char_name = models.CharField(max_length=35, blank=True, default="")
    char_level = models.PositiveIntegerField(default=1)
    char_class = models.PositiveIntegerField(default=0)
    char_title = models.CharField(max_length=35, blank=True, default="")
    char_sex = models.PositiveSmallIntegerField(default=0)
    char_pvp = models.PositiveIntegerField(default=0)
    char_pk = models.PositiveIntegerField(default=0)
    char_clan_name = models.CharField(max_length=45, blank=True, default="")
    char_is_clan_leader = models.BooleanField(default=False)
    equipment = models.JSONField(default=list, blank=True)
    bag_items = models.JSONField(default=list, blank=True)
    old_account = models.CharField(max_length=45, blank=True, default="")
    ends_at = models.DateTimeField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)

    class Meta:
        verbose_name = _("Leilão")
        verbose_name_plural = _("Leilões")
        ordering = ["ends_at"]
        indexes = [
            models.Index(fields=["kind", "status"]),
            models.Index(fields=["char_id", "status"]),
        ]


class Bid(BaseModel):
    """Lance de um participante com o personagem escolhido para receber os itens.

    Relaciona os registros por ``auction``, ``bidder``. Herda BaseModel: use ``id`` (UUID) nas
    APIs; ``pk``/``seq_id`` são internos. Use os serviços de aplicação para operações de
    negócio, mantendo neste modelo as regras de persistência e os relacionamentos.
    """

    auction = models.ForeignKey(Auction, on_delete=models.CASCADE, related_name="bids")
    bidder = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="auction_bids")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    character_name = models.CharField(max_length=35, blank=True, default="")

    class Meta:
        verbose_name = _("Lance")
        verbose_name_plural = _("Lances")
        ordering = ["-created_at"]
