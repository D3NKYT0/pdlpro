from django.db import models

from common.models import BaseModel


class Auction(BaseModel):
    seller = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="auctions")
    item_id = models.PositiveIntegerField()
    item_name = models.CharField(max_length=80)
    min_bid = models.DecimalField(max_digits=12, decimal_places=2)
    ends_at = models.DateTimeField()
    status = models.CharField(max_length=20, default="open")

    class Meta:
        verbose_name = "Leilão"
        verbose_name_plural = "Leilões"

