from __future__ import annotations

from abc import ABC, abstractmethod
from uuid import UUID

from apps.communication.domain.entities import NotificationEntity


class INotificationRepository(ABC):
    @abstractmethod
    def list_for_user(self, user_id: UUID) -> list[NotificationEntity]:
        raise NotImplementedError

    @abstractmethod
    def unread_count(self, user_id: UUID) -> int:
        raise NotImplementedError

    @abstractmethod
    def mark_read(self, user_id: UUID, notification_id: UUID) -> NotificationEntity | None:
        raise NotImplementedError

    @abstractmethod
    def mark_all_read(self, user_id: UUID) -> int:
        raise NotImplementedError

    @abstractmethod
    def create(self, user_id: UUID, *, title: str, body: str, kind: str = "info", link: str = "") -> NotificationEntity:
        raise NotImplementedError
