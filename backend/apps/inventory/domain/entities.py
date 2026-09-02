from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True, slots=True)
class InventoryEntity:
    """Identificação do inventário do painel associado a um usuário e personagem.

    É um objeto de dados; não carrega métodos de persistência do ORM. Consulte os campos tipados
    abaixo ao montar ou consumir o resultado.
    """

    id: UUID
    user_id: UUID
    character_name: str
    account_name: str


@dataclass(frozen=True, slots=True)
class InventoryItemEntity:
    """Pilha de itens do inventário do painel, com quantidade e encantamento.

    É um objeto de dados; não carrega métodos de persistência do ORM. Consulte os campos tipados
    abaixo ao montar ou consumir o resultado.
    """

    id: UUID
    inventory_id: UUID
    item_id: int
    item_name: str
    quantity: int
    enchant: int
