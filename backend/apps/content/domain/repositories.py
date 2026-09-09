from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any
from uuid import UUID


class INewsAdminRepository(ABC):
    """Porta administrativa de notícias (News).

    Injete nos casos de uso staff e registre o adaptador no ContentProvider.
    """

    @abstractmethod
    def list_all(self) -> list[Any]:
        """Lista notícias ordenadas da mais recente à mais antiga."""

        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, news_id: UUID) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def slug_exists(self, slug: str, *, exclude_id: UUID | None = None) -> bool:
        raise NotImplementedError

    @abstractmethod
    def new(self, **fields) -> Any:
        """Instancia uma notícia ainda não persistida."""

        raise NotImplementedError

    @abstractmethod
    def save(self, row: Any) -> Any:
        """Persiste a notícia e devolve a linha salva."""

        raise NotImplementedError
