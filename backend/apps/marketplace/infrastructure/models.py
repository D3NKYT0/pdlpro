from django.conf import settings
from django.db import models

from common.models import BaseModel


class CharacterListing(BaseModel):
    class Status(models.TextChoices):
        FOR_SALE = "for_sale", "À venda"
        SOLD = "sold", "Vendido"
        CANCELLED = "cancelled", "Cancelado"
        DISPUTED = "disputed", "Em disputa"

    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="character_listings",
    )
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="character_purchases",
        null=True,
        blank=True,
    )
    char_id = models.PositiveIntegerField()
    char_name = models.CharField(max_length=35)
    char_level = models.PositiveIntegerField(default=1)
    char_class = models.PositiveIntegerField(default=0)
    old_account = models.CharField(max_length=45, blank=True, default="")
    new_account = models.CharField(max_length=45, blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.FOR_SALE)
    notes = models.TextField(blank=True)
    sold_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Anúncio de personagem"
        verbose_name_plural = "Anúncios de personagem"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["char_id"]),
        ]
