from __future__ import annotations

from abc import ABC, abstractmethod
from uuid import UUID


class IPushSender(ABC):
    """Porta de disponibilidade, chave pública e envio de notificações Web Push.

    Injete no serviço de notificação e nos casos de uso de assinatura. O adaptador resolve as
    assinaturas e credenciais; a aplicação informa o usuário de destino, título, corpo e URL da
    notificação.
    """

    @abstractmethod
    def is_configured(self) -> bool:
        raise NotImplementedError

    @abstractmethod
    def public_key(self) -> str:
        raise NotImplementedError

    @abstractmethod
    def send(self, user_id: UUID, *, title: str, body: str, url: str = "") -> int:
        raise NotImplementedError
