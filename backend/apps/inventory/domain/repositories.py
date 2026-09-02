from __future__ import annotations

from abc import ABC, abstractmethod
from uuid import UUID

from apps.inventory.domain.entities import InventoryEntity, InventoryItemEntity


class IInventoryRepository(ABC):
    """Porta de inventários, pilhas de itens, bloqueios e histórico de movimentações.

    Injete esta interface nos serviços de aplicação e registre o adaptador no provider. As
    assinaturas abaixo definem entradas e retornos; resultados opcionais usam None para
    ausência. Validação de negócio e autorização devem ocorrer no caso de uso que chama a porta.
    """

    @abstractmethod
    def get_or_create(self, user_id: UUID, character_name: str, account_name: str) -> InventoryEntity:
        raise NotImplementedError

    @abstractmethod
    def list_by_user(self, user_id: UUID) -> list[InventoryEntity]:
        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, inventory_id: UUID, user_id: UUID) -> InventoryEntity | None:
        raise NotImplementedError

    @abstractmethod
    def list_items(self, inventory_id: UUID) -> list[InventoryItemEntity]:
        raise NotImplementedError

    @abstractmethod
    def add_item(self, inventory_id: UUID, item_id: int, item_name: str, quantity: int, enchant: int) -> InventoryItemEntity:
        raise NotImplementedError

    @abstractmethod
    def remove_item(self, inventory_id: UUID, item_id: int, quantity: int, enchant: int) -> InventoryItemEntity:
        raise NotImplementedError

    @abstractmethod
    def is_blocked(self, item_id: int) -> bool:
        raise NotImplementedError

    @abstractmethod
    def log(
        self,
        user_id: UUID,
        *,
        action: str,
        item_id: int,
        item_name: str,
        quantity: int,
        enchant: int,
        origin: str,
        destination: str,
    ) -> None:
        raise NotImplementedError
