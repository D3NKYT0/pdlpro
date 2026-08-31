from __future__ import annotations

from abc import ABC, abstractmethod
from uuid import UUID

from apps.clans.domain.entities import ClanApplicationEntity, ClanEntity


class IClanRepository(ABC):
    @abstractmethod
    def get_by_id(self, clan_id: UUID) -> ClanEntity | None:
        raise NotImplementedError

    @abstractmethod
    def name_exists(self, name: str) -> bool:
        raise NotImplementedError

    @abstractmethod
    def list_public(self) -> list[ClanEntity]:
        raise NotImplementedError

    @abstractmethod
    def create(
        self,
        *,
        owner_id: UUID,
        name: str,
        description: str,
        motd: str,
        focus: str,
        min_level: int,
        recruiting: bool,
        clan_id: int | None,
    ) -> ClanEntity:
        raise NotImplementedError


class IClanApplicationRepository(ABC):
    @abstractmethod
    def get_by_id(self, application_id: UUID) -> ClanApplicationEntity | None:
        raise NotImplementedError

    @abstractmethod
    def exists_pending(self, clan_id: UUID, user_id: UUID) -> bool:
        raise NotImplementedError

    @abstractmethod
    def create(
        self,
        *,
        clan_id: UUID,
        user_id: UUID,
        char_name: str,
        message: str,
    ) -> ClanApplicationEntity:
        raise NotImplementedError

    @abstractmethod
    def list_for_user(self, user_id: UUID) -> list[ClanApplicationEntity]:
        raise NotImplementedError

    @abstractmethod
    def list_for_clan(self, clan_id: UUID) -> list[ClanApplicationEntity]:
        raise NotImplementedError

    @abstractmethod
    def review(self, application_id: UUID, *, status: str) -> ClanApplicationEntity | None:
        raise NotImplementedError
