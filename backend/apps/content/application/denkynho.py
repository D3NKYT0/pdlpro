"""Casos de uso do Denkynho como mascote individual do usuário."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from uuid import UUID

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from apps.accounts.application.progress import xp_for_level
from apps.content.infrastructure.models import DenkynhoCareAction, DenkynhoProfile
from common.architecture.base import UseCase
from common.architecture.exceptions import ConflictError, ValidationDomainError

_DECAY_INTERVAL = timedelta(minutes=30)
_DECAY = {"satiety": 4, "energy": 3, "happiness": 2, "hygiene": 2}
_EFFECTS = {
    DenkynhoCareAction.Action.FEED: ({"satiety": 32, "happiness": 5}, 12),
    DenkynhoCareAction.Action.SLEEP: ({"energy": 35}, 10),
    DenkynhoCareAction.Action.PLAY: ({"satiety": -8, "energy": -12, "happiness": 28}, 18),
    DenkynhoCareAction.Action.CARE: ({"hygiene": 30, "happiness": 6}, 12),
}
_SATURATED_MESSAGES = {
    DenkynhoCareAction.Action.FEED: "O Denkynho já está satisfeito.",
    DenkynhoCareAction.Action.SLEEP: "O Denkynho já descansou bastante.",
    DenkynhoCareAction.Action.PLAY: "O Denkynho já está muito feliz para brincar agora.",
    DenkynhoCareAction.Action.CARE: "O Denkynho já está bem cuidado.",
}


def _serialize(profile: DenkynhoProfile) -> dict:
    """Expõe somente o estado necessário para desenhar o mascote autenticado."""

    return {
        "level": profile.level,
        "experience": profile.experience,
        "experience_next": xp_for_level(profile.level),
        "attributes": {
            "satiety": profile.satiety,
            "energy": profile.energy,
            "happiness": profile.happiness,
            "hygiene": profile.hygiene,
        },
    }


def _apply_decay(profile: DenkynhoProfile, now) -> bool:
    """Aplica períodos completos de desgaste e preserva o tempo restante para a próxima vez."""

    elapsed = now - profile.last_decay_at
    periods = max(0, elapsed // _DECAY_INTERVAL)
    if not periods:
        return False
    for attribute, amount in _DECAY.items():
        setattr(profile, attribute, max(0, getattr(profile, attribute) - amount * periods))
    profile.last_decay_at += _DECAY_INTERVAL * periods
    return True


def _add_experience(profile: DenkynhoProfile, amount: int) -> None:
    """Soma XP do mascote usando a mesma curva progressiva exibida no painel."""

    profile.experience += amount
    while profile.experience >= xp_for_level(profile.level):
        profile.experience -= xp_for_level(profile.level)
        profile.level += 1


def _validate_action(profile: DenkynhoProfile, action: str) -> None:
    """Evita XP sem cuidado efetivo e bloqueia brincadeira quando faltam necessidades básicas."""

    if action == DenkynhoCareAction.Action.PLAY:
        if profile.energy < 12:
            raise ValidationDomainError("O Denkynho precisa descansar antes de brincar.")
        if profile.satiety < 8:
            raise ValidationDomainError("O Denkynho precisa comer antes de brincar.")
    target = {
        DenkynhoCareAction.Action.FEED: "satiety",
        DenkynhoCareAction.Action.SLEEP: "energy",
        DenkynhoCareAction.Action.PLAY: "happiness",
        DenkynhoCareAction.Action.CARE: "hygiene",
    }[action]
    if getattr(profile, target) >= 100:
        raise ValidationDomainError(_SATURATED_MESSAGES[action])


def _locked_profile(user) -> DenkynhoProfile:
    """Obtém o perfil individual sob bloqueio de linha para serializar cuidados concorrentes."""

    DenkynhoProfile.objects.get_or_create(user=user)
    return DenkynhoProfile.objects.select_for_update().get(user=user)


@dataclass(frozen=True, slots=True)
class CareDenkynhoInput:
    """Dados validados para um cuidado idempotente do mascote da sessão."""

    user_id: UUID
    action: str
    idempotency_key: UUID


class GetDenkynhoProfileUseCase(UseCase[UUID, dict]):
    """Carrega e atualiza o desgaste natural do Denkynho do usuário solicitado."""

    def execute(self, user_id: UUID) -> dict:
        user = get_user_model().objects.get(id=user_id)
        with transaction.atomic():
            profile = _locked_profile(user)
            if _apply_decay(profile, timezone.now()):
                profile.save(update_fields=[*list(_DECAY), "last_decay_at", "updated_at"])
            return _serialize(profile)


class CareDenkynhoUseCase(UseCase[CareDenkynhoInput, dict]):
    """Aplica um cuidado, limita atributos e grava sua chave para que retries não dupliquem XP."""

    def execute(self, data: CareDenkynhoInput) -> dict:
        user = get_user_model().objects.get(id=data.user_id)
        with transaction.atomic():
            profile = _locked_profile(user)
            previous = DenkynhoCareAction.objects.filter(
                profile=profile,
                idempotency_key=data.idempotency_key,
            ).first()
            if previous is not None:
                if previous.action != data.action:
                    raise ConflictError("Esta chave de solicitação já foi usada para outra ação.")
                return {
                    **_serialize(profile),
                    "action": previous.action,
                    "xp_gained": previous.xp_gained,
                    "replayed": True,
                }

            _apply_decay(profile, timezone.now())
            _validate_action(profile, data.action)
            effects, experience = _EFFECTS[data.action]
            for attribute, change in effects.items():
                setattr(profile, attribute, min(100, max(0, getattr(profile, attribute) + change)))
            _add_experience(profile, experience)
            profile.save(update_fields=[*list(_DECAY), "experience", "level", "last_decay_at", "updated_at"])
            DenkynhoCareAction.objects.create(
                profile=profile,
                idempotency_key=data.idempotency_key,
                action=data.action,
                xp_gained=experience,
            )
            return {
                **_serialize(profile),
                "action": data.action,
                "xp_gained": experience,
                "replayed": False,
            }
