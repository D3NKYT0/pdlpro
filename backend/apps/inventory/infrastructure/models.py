from django.db import models

from common.models import BaseModel


class InventoryItem(BaseModel):
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="inventory_items")
    item_id = models.PositiveIntegerField()
    quantity = models.PositiveIntegerField(default=1)
    enchant = models.PositiveIntegerField(default=0)
    character_name = models.CharField(max_length=35, blank=True)

    class Meta:
        verbose_name = "Item de inventário"
        verbose_name_plural = "Itens de inventário"

