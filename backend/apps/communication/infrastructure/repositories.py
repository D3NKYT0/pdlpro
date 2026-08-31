from __future__ import annotations

from uuid import UUID

from apps.communication.domain.entities import NotificationEntity
from apps.communication.domain.repositories import INotificationRepository
from apps.communication.infrastructure.models import Notification


class DjangoNotificationRepository(INotificationRepository):
    def _entity(self, row: Notification) -> NotificationEntity:
        return NotificationEntity(
            id=row.id,
            title=row.title,
            body=row.body,
            kind=row.kind,
            link=row.link,
            is_read=row.is_read,
            created_at=row.created_at.isoformat(),
        )

    def list_for_user(self, user_id: UUID) -> list[NotificationEntity]:
        rows = Notification.objects.filter(user__id=user_id)[:50]
        return [self._entity(row) for row in rows]

    def unread_count(self, user_id: UUID) -> int:
        return Notification.objects.filter(user__id=user_id, is_read=False).count()

    def mark_read(self, user_id: UUID, notification_id: UUID) -> NotificationEntity | None:
        row = Notification.objects.filter(id=notification_id, user__id=user_id).first()
        if row is None:
            return None
        if not row.is_read:
            row.is_read = True
            row.save(update_fields=["is_read", "updated_at"])
        return self._entity(row)

    def mark_all_read(self, user_id: UUID) -> int:
        return Notification.objects.filter(user__id=user_id, is_read=False).update(is_read=True)

    def create(self, user_id: UUID, *, title: str, body: str, kind: str = "info", link: str = "") -> NotificationEntity:
        from django.contrib.auth import get_user_model

        user = get_user_model().objects.get(id=user_id)
        row = Notification.objects.create(user=user, title=title, body=body, kind=kind, link=link)
        return self._entity(row)
