from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any
from uuid import UUID


class IGameConfigAdminRepository(ABC):
    """Porta administrativa de configuração de jogos (GameConfig).

    Injete nos casos de uso staff e registre o adaptador no GamesProvider.
    """

    @abstractmethod
    def list_all(self) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, config_id: UUID) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def get_by_code(self, code: str) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def save(self, row: Any) -> Any:
        raise NotImplementedError


class IGameContentAdminRepository(ABC):
    """Porta administrativa do conteúdo configurável dos jogos (passe, diário, iscas).

    Injete nos casos de uso staff de conteúdo e registre o adaptador no GamesProvider.
    """

    @abstractmethod
    def list_kind(self, kind: str) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def get_kind(self, kind: str, entry_id: UUID) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def create(self, kind: str, validated_data: dict) -> Any:
        raise NotImplementedError

    @abstractmethod
    def update(self, kind: str, entry_id: UUID, validated_data: dict) -> Any:
        raise NotImplementedError

    @abstractmethod
    def has_active_overlap(
        self,
        kind: str,
        *,
        start_key: str,
        end_key: str,
        start,
        end,
        exclude_id: UUID | None = None,
    ) -> bool:
        """Indica se já existe temporada ativa sobreposta ao intervalo informado."""

        raise NotImplementedError
