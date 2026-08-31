from django.conf import settings
from django.db import models

from common.models import BaseModel


class Auction(BaseModel):
    class Status(models.TextChoices):
        OPEN = "open", "Aberto"
        FINISHED = "finished", "Finalizado"
        CANCELLED = "cancelled", "Cancelado"

    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="auctions")
    item_id = models.PositiveIntegerField()
    item_name = models.CharField(max_length=80)
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
    ends_at = models.DateTimeField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)

    class Meta:
        verbose_name = "Leilão"
        verbose_name_plural = "Leilões"
        ordering = ["ends_at"]


class Bid(BaseModel):
    auction = models.ForeignKey(Auction, on_delete=models.CASCADE, related_name="bids")
    bidder = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="auction_bids")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    character_name = models.CharField(max_length=35)

    class Meta:
        verbose_name = "Lance"
        verbose_name_plural = "Lances"
        ordering = ["-created_at"]
