from __future__ import annotations

from dataclasses import dataclass

from apps.accounts.domain.repositories import IUserRepository
from apps.communication.application.notify import NotifyUser
from apps.communication.domain.entities import (
    NotificationEntity,
    StaffNotificationRecord,
)
from apps.communication.domain.repositories import INotificationAdminRepository
from apps.staff.application.parsing import parse_required_uuid
from common.architecture.base import UseCase
from common.architecture.exceptions import EntityNotFoundError, ValidationDomainError

ALLOWED_KINDS = ("info", "support", "payment", "staff")


def _dump_record(row: StaffNotificationRecord) -> dict:
    return {
        "id": str(row.id),
        "user_id": str(row.user_id),
        "username": row.username,
        "title": row.title,
        "body": row.body,
        "kind": row.kind,
        "link": row.link,
        "is_read": row.is_read,
        "created_at": row.created_at,
    }


def _dump_entity(entity: NotificationEntity, username: str) -> dict:
    return {
        "id": str(entity.id),
        "user_id": "",
        "username": username,
        "title": entity.title,
        "body": entity.body,
        "kind": entity.kind,
        "link": entity.link,
        "is_read": entity.is_read,
        "created_at": entity.created_at,
    }


@dataclass(frozen=True, slots=True)
class ListStaffNotificationsInput:
    """Filtro textual opcional da listagem administrativa de avisos."""

    query: str = ""


class ListStaffNotificationsUseCase(UseCase[ListStaffNotificationsInput | None, list[dict]]):
    """Lista avisos recentes de qualquer jogador para a equipe."""

    def __init__(self, notifications: INotificationAdminRepository) -> None:
        self._notifications = notifications

    def execute(self, data: ListStaffNotificationsInput | None = None) -> list[dict]:
        query = data.query if data else ""
        return [_dump_record(item) for item in self._notifications.list_recent(query=query)]


class SendStaffNotificationUseCase(UseCase[dict, dict]):
    """Envia um aviso a um usuário ativo ou a todas as contas ativas, com push."""

    def __init__(self, users: IUserRepository, notify: NotifyUser) -> None:
        self._users = users
        self._notify = notify

    def execute(self, data: dict) -> dict:
        title = str(data.get("title") or "").strip()[:120]
        body = str(data.get("body") or "").strip()
        if not title:
            raise ValidationDomainError("Informe o título do aviso.")
        kind = str(data.get("kind") or "info").strip() or "info"
        if kind not in ALLOWED_KINDS:
            raise ValidationDomainError("Tipo de aviso inválido.")
        link = str(data.get("link") or "").strip()[:500]
        broadcast = bool(data.get("broadcast"))
        username = str(data.get("username") or "").strip()
        if broadcast:
            user_ids = self._users.list_active_ids()
            if not user_ids:
                raise ValidationDomainError("Não há usuários ativos para receber o aviso.")
            sent = 0
            for user_id in user_ids:
                self._notify.send(user_id, title=title, body=body, kind=kind, link=link)
                sent += 1
            return {"sent": sent, "broadcast": True, "title": title}
        if not username:
            raise ValidationDomainError("Informe o usuário de destino ou envie para todos.")
        user = self._users.get_active_by_username(username)
        if user is None:
            raise ValidationDomainError("Usuário não encontrado.")
        entity = self._notify.send(user.id, title=title, body=body, kind=kind, link=link)
        payload = _dump_entity(entity, user.username)
        payload["user_id"] = str(user.id)
        payload["sent"] = 1
        payload["broadcast"] = False
        return payload


class DeleteStaffNotificationUseCase(UseCase[dict, dict]):
    """Remove um aviso persistido."""

    def __init__(self, notifications: INotificationAdminRepository) -> None:
        self._notifications = notifications

    def execute(self, data: dict) -> dict:
        notification_id = parse_required_uuid(data.get("id"))
        if not self._notifications.delete(notification_id):
            raise EntityNotFoundError("Notificação não encontrada.")
        return {"deleted": True}
