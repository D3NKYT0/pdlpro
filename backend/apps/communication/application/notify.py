from __future__ import annotations

from uuid import UUID

from apps.communication.domain.entities import NotificationEntity
from apps.communication.domain.push import IPushSender
from apps.communication.domain.repositories import INotificationRepository


class NotifyUser:
    """Cria uma notificação persistida e solicita sua entrega por Web Push.

    Resolva a classe pelo container e chame ``send(user_id, title=..., body=...)``. Retorna
    NotificationEntity; ``link`` também vira a URL do push. A gravação ocorre antes do envio e
    esta classe não cria uma transação entre ambos; o tratamento de indisponibilidade do push
    pertence ao adaptador.
    """

    def __init__(self, notifications: INotificationRepository, push: IPushSender) -> None:
        self._notifications = notifications
        self._push = push

    def send(self, user_id: UUID, *, title: str, body: str, kind: str = "info", link: str = "") -> NotificationEntity:
        """Persiste a notificação, solicita o push e devolve a entidade gravada."""

        entity = self._notifications.create(user_id, title=title, body=body, kind=kind, link=link)
        self._push.send(user_id, title=title, body=body, url=link)
        return entity
