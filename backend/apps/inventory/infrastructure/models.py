from django.db import models

from common.models import BaseModel


class Inventory(BaseModel):
    """Inventário do painel por usuário e personagem, separado dos itens que ainda estão no jogo.

    Relaciona os registros por ``user``. Herda BaseModel: use ``id`` (UUID) nas APIs;
    ``pk``/``seq_id`` são internos. Use os serviços de aplicação para operações de negócio,
    mantendo neste modelo as regras de persistência e os relacionamentos.
    """

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
    """Pilha de um tipo de item no inventário do painel, diferenciada também pelo encantamento.

    Relaciona os registros por ``inventory``, ``user``. Herda BaseModel: use ``id`` (UUID) nas
    APIs; ``pk``/``seq_id`` são internos. Use os serviços de aplicação para operações de
    negócio, mantendo neste modelo as regras de persistência e os relacionamentos.
    """

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
    """Tipo de item do servidor bloqueado para as operações de inventário que consultam esta lista.
    Herda BaseModel: use ``id`` (UUID) nas APIs; ``pk``/``seq_id`` são internos. Use os serviços
    de aplicação para operações de negócio, mantendo neste modelo as regras de persistência e os
    relacionamentos.
    """

    item_id = models.PositiveIntegerField(unique=True)
    reason = models.CharField(max_length=200, blank=True)

    class Meta:
        verbose_name = "Item bloqueado"
        verbose_name_plural = "Itens bloqueados"


class InventoryLog(BaseModel):
    """Histórico de movimentação de itens, com origem, destino e ação executada.

    Relaciona os registros por ``user``. Herda BaseModel: use ``id`` (UUID) nas APIs;
    ``pk``/``seq_id`` são internos. Use os serviços de aplicação para operações de negócio,
    mantendo neste modelo as regras de persistência e os relacionamentos.
    """

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
