from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from apps.communication.domain.push import IPushSender
from apps.communication.infrastructure.models import PushSubscription
from common.architecture.base import UseCase
from common.architecture.exceptions import ValidationDomainError


class GetVapidPublicKeyUseCase(UseCase[None, dict]):
    """Retorna a chave VAPID pública e informa se o serviço de push está configurado.

    Uso: resolva pelo container e chame ``execute(data)`` com ``None`` (ou omita o argumento). O
    retorno é ``dict``.
    """

    def __init__(self, push: IPushSender) -> None:
        self._push = push

    def execute(self, data: None = None) -> dict:
        return {"public_key": self._push.public_key(), "enabled": self._push.is_configured()}


@dataclass(frozen=True, slots=True)
class SubscribePushInput:
    """Dados de entrada de ``SubscribePushUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    user_id: UUID
    endpoint: str
    auth: str
    p256dh: str


class SubscribePushUseCase(UseCase[SubscribePushInput, dict]):
    """Valida endpoint e chaves e cria ou atualiza a assinatura Web Push associada ao usuário.

    Uso: resolva pelo container e chame ``execute(data)`` com ``SubscribePushInput``. O retorno
    é ``dict``.
    """

    def execute(self, data: SubscribePushInput) -> dict:
        endpoint = data.endpoint.strip()
        auth = data.auth.strip()
        p256dh = data.p256dh.strip()
        if not endpoint or not auth or not p256dh:
            raise ValidationDomainError("Inscrição push incompleta.")
        from django.contrib.auth import get_user_model

        user = get_user_model().objects.get(id=data.user_id)
        row, _ = PushSubscription.objects.update_or_create(
            user=user,
            endpoint=endpoint,
            defaults={"auth": auth, "p256dh": p256dh},
        )
        return {"id": str(row.id), "subscribed": True}


@dataclass(frozen=True, slots=True)
class UnsubscribePushInput:
    """Dados de entrada de ``UnsubscribePushUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    user_id: UUID
    endpoint: str


class UnsubscribePushUseCase(UseCase[UnsubscribePushInput, dict]):
    """Exclui a assinatura do endpoint somente para o usuário informado e retorna a contagem
    removida.

    Uso: resolva pelo container e chame ``execute(data)`` com ``UnsubscribePushInput``. O
    retorno é ``dict``.
    """

    def execute(self, data: UnsubscribePushInput) -> dict:
        deleted, _ = PushSubscription.objects.filter(user__id=data.user_id, endpoint=data.endpoint.strip()).delete()
        return {"deleted": deleted}
