from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True, slots=True)
class AccessibleAccount:
    login: str
    is_primary: bool
    linked: bool


@dataclass(frozen=True, slots=True)
class PrimaryLoginState:
    login: str
    status: str


def same_linked_user(linked_user_id: str | None, user_id: UUID | str) -> bool:
    if not linked_user_id:
        return False
    linked = str(linked_user_id).replace("-", "").strip().lower()
    return linked == str(user_id).replace("-", "").lower()


class IAccountAccessService(ABC):
    @abstractmethod
    def can_access(self, user_id: UUID, username: str, login: str) -> bool:
        raise NotImplementedError

    @abstractmethod
    def list_accounts(self, user_id: UUID, username: str) -> list[AccessibleAccount]:
        raise NotImplementedError

    @abstractmethod
    def can_link_more(self, user_id: UUID, username: str) -> bool:
        raise NotImplementedError

    @abstractmethod
    def slot_usage(self, user_id: UUID, username: str) -> tuple[int, int]:
        """Retorna (usados, total)."""
        raise NotImplementedError
