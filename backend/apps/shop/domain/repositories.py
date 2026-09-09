from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any
from uuid import UUID


class IShopItemAdminRepository(ABC):
    """Porta administrativa de produtos da loja (ShopItem).

    Injete nos casos de uso staff e registre o adaptador no ShopProvider.
    """

    @abstractmethod
    def list_all(self) -> list[Any]:
        """Lista todos os produtos, inclusive inativos, ordenados por nome."""

        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, item_id: UUID) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def new(self, **fields) -> Any:
        """Instancia um produto ainda não persistido."""

        raise NotImplementedError

    @abstractmethod
    def save(self, row: Any) -> Any:
        """Persiste o produto e devolve a linha salva."""

        raise NotImplementedError
