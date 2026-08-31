from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from apps.communication.domain.push import IPushSender
from apps.communication.infrastructure.models import PushSubscription
from common.architecture.base import UseCase
from common.architecture.exceptions import ValidationDomainError


class GetVapidPublicKeyUseCase(UseCase[None, dict]):
    def __init__(self, push: IPushSender) -> None:
        self._push = push

    def execute(self, data: None = None) -> dict:
        return {"public_key": self._push.public_key(), "enabled": self._push.is_configured()}


@dataclass(frozen=True, slots=True)
class SubscribePushInput:
    user_id: UUID
    endpoint: str
    auth: str
    p256dh: str


class SubscribePushUseCase(UseCase[SubscribePushInput, dict]):
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
    user_id: UUID
    endpoint: str


class UnsubscribePushUseCase(UseCase[UnsubscribePushInput, dict]):
    def execute(self, data: UnsubscribePushInput) -> dict:
        deleted, _ = PushSubscription.objects.filter(user__id=data.user_id, endpoint=data.endpoint.strip()).delete()
        return {"deleted": deleted}
