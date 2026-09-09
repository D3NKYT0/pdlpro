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


class IContentCatalogRepository(ABC):
    """Porta do catálogo público CMS: notícias, FAQ, downloads, wiki e calendário.

    Injete nos casos de uso de ``application/use_cases.py`` e registre no ContentProvider.
    """

    @abstractmethod
    def list_published_news(self) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def get_published_news_by_slug(self, slug: str) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def list_published_faq(
        self,
        *,
        audiences: list[str],
        assistant_only: bool | None = False,
    ) -> list[Any]:
        """Lista FAQs publicadas. ``assistant_only=None`` não filtra o flag."""

        raise NotImplementedError

    @abstractmethod
    def list_published_downloads(self) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def list_published_wiki(self) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def get_published_wiki_by_slug(self, slug: str) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def search_published_wiki(self, query: str, *, limit: int = 30) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def list_published_calendar(self) -> list[Any]:
        raise NotImplementedError


class IDenkynhoRepository(ABC):
    """Porta do mascote Denkynho: perfil sob bloqueio, cuidados e preferências.

    Cobre o ORM usado em ``application/denkynho.py``, ``application/wardrobe.py`` e
    ``application/chat.py``. O perfil devolvido ainda é mutável pelo caso de uso
    (atributos e ``save``); consultas e criações de cuidados passam pela porta.
    """

    @abstractmethod
    def require_user(self, user_id: UUID) -> Any:
        """Usuário ORM por id; propaga DoesNotExist se ausente."""

        raise NotImplementedError

    @abstractmethod
    def get_locked_profile(self, user) -> Any:
        """Garante o perfil e devolve a linha sob ``select_for_update``."""

        raise NotImplementedError

    @abstractmethod
    def find_care_action(self, profile, idempotency_key: UUID) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def create_care_action(
        self,
        profile,
        *,
        idempotency_key: UUID,
        action: str,
        xp_gained: int,
    ) -> Any:
        raise NotImplementedError

    @abstractmethod
    def get_preferences(self, account_id: UUID) -> dict[str, str]:
        """Apelido e detalhe do mascote; defaults se usuário/perfil ausentes."""

        raise NotImplementedError
