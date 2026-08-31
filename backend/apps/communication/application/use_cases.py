from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from apps.communication.domain.entities import NotificationEntity
from apps.communication.domain.repositories import INotificationRepository
from common.architecture.base import UseCase
from common.architecture.exceptions import EntityNotFoundError


@dataclass(frozen=True, slots=True)
class ListNotificationsInput:
    user_id: UUID


class ListNotificationsUseCase(UseCase[ListNotificationsInput, dict]):
    def __init__(self, notifications: INotificationRepository) -> None:
        self._notifications = notifications

    def execute(self, data: ListNotificationsInput) -> dict:
        return {
            "unread": self._notifications.unread_count(data.user_id),
            "results": self._notifications.list_for_user(data.user_id),
        }


@dataclass(frozen=True, slots=True)
class MarkNotificationReadInput:
    user_id: UUID
    notification_id: UUID | None = None


class MarkNotificationReadUseCase(UseCase[MarkNotificationReadInput, dict]):
    def __init__(self, notifications: INotificationRepository) -> None:
        self._notifications = notifications

    def execute(self, data: MarkNotificationReadInput) -> dict:
        if data.notification_id is None:
            updated = self._notifications.mark_all_read(data.user_id)
            return {"updated": updated}
        row = self._notifications.mark_read(data.user_id, data.notification_id)
        if row is None:
            raise EntityNotFoundError("Notificação não encontrada.")
        return {"id": str(row.id), "is_read": row.is_read}
