from django.db import models

from common.models import BaseModel


class Inventory(BaseModel):
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="inventories")
    character_name = models.CharField(max_length=35)
    account_name = models.CharField(max_length=45, blank=True)

    class Meta:
        verbose_name = "Inventário"
        verbose_name_plural = "Inventários"
        unique_together = ("user", "character_name")

    def __str__(self) -> str:
        return f"{self.user} / {self.character_name}"


class InventoryItem(BaseModel):
    inventory = models.ForeignKey(
        Inventory,
        on_delete=models.CASCADE,
        related_name="items",
        null=True,
        blank=True,
    )
    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="inventory_items",
        null=True,
        blank=True,
    )
    item_id = models.PositiveIntegerField()
    item_name = models.CharField(max_length=80, blank=True, default="")
    quantity = models.PositiveIntegerField(default=1)
    enchant = models.PositiveIntegerField(default=0)
    character_name = models.CharField(max_length=35, blank=True)

    class Meta:
        verbose_name = "Item de inventário"
        verbose_name_plural = "Itens de inventário"


class BlockedServerItem(BaseModel):
    item_id = models.PositiveIntegerField(unique=True)
    reason = models.CharField(max_length=200, blank=True)

    class Meta:
        verbose_name = "Item bloqueado"
        verbose_name_plural = "Itens bloqueados"


class InventoryLog(BaseModel):
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="inventory_logs")
    action = models.CharField(max_length=40)
    item_id = models.PositiveIntegerField()
    item_name = models.CharField(max_length=80, blank=True)
    quantity = models.PositiveIntegerField()
    enchant = models.PositiveIntegerField(default=0)
    origin = models.CharField(max_length=80, blank=True)
    destination = models.CharField(max_length=80, blank=True)

    class Meta:
        verbose_name = "Log de inventário"
        verbose_name_plural = "Logs de inventário"
