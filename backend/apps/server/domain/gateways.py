from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ServerStatus:
    game_online: bool
    login_online: bool
    players_online: int


@dataclass(frozen=True, slots=True)
class RankingEntry:
    position: int
    name: str
    value: int
    extra: dict


class ILineageGateway(ABC):
    """Porta para o banco do servidor Lineage 2. Nunca expor SQL ao frontend."""

    @abstractmethod
    def get_status(self) -> ServerStatus:
        raise NotImplementedError

    @abstractmethod
    def get_top_pvp(self, limit: int = 10) -> list[RankingEntry]:
        raise NotImplementedError

    @abstractmethod
    def get_top_pk(self, limit: int = 10) -> list[RankingEntry]:
        raise NotImplementedError

    @abstractmethod
    def get_top_level(self, limit: int = 10) -> list[RankingEntry]:
        raise NotImplementedError

    @abstractmethod
    def get_top_online(self, limit: int = 10) -> list[RankingEntry]:
        raise NotImplementedError

    @abstractmethod
    def get_top_clans(self, limit: int = 10) -> list[RankingEntry]:
        raise NotImplementedError

    @abstractmethod
    def get_top_adena(self, limit: int = 10) -> list[RankingEntry]:
        raise NotImplementedError
