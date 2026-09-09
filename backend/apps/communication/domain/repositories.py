from __future__ import annotations

from abc import ABC, abstractmethod
from uuid import UUID

from apps.communication.domain.entities import NotificationEntity


class INotificationRepository(ABC):
    """Porta de notificações por usuário e marcação de leitura.

    Injete esta interface nos serviços de aplicação e registre o adaptador no provider. As
    assinaturas abaixo definem entradas e retornos; resultados opcionais usam None para
    ausência. Validação de negócio e autorização devem ocorrer no caso de uso que chama a porta.
    """

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


class IPushSubscriptionRepository(ABC):
    """Porta de assinaturas Web Push por usuário.

    Injete nos casos de uso de push e registre o adaptador no CommunicationProvider.
    """

    @abstractmethod
    def upsert(self, user_id: UUID, *, endpoint: str, auth: str, p256dh: str) -> dict:
        """Cria ou atualiza a assinatura e devolve ``{"id": str, "subscribed": True}``."""

        raise NotImplementedError

    @abstractmethod
    def delete(self, user_id: UUID, endpoint: str) -> int:
        """Remove a assinatura do endpoint; devolve quantas linhas foram apagadas."""

        raise NotImplementedError
