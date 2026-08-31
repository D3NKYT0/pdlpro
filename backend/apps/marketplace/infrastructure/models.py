from django.db import models

from common.models import BaseModel


class CharacterListing(BaseModel):
    seller = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="character_listings")
    char_id = models.PositiveIntegerField()
    char_name = models.CharField(max_length=35)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, default="listed")

    class Meta:
        verbose_name = "Anúncio de personagem"
        verbose_name_plural = "Anúncios de personagem"

