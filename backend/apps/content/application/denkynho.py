"""Casos de uso do Denkynho como mascote individual do usuário."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from uuid import UUID

from django.utils import timezone

from apps.accounts.application.progress import xp_for_level
from apps.content.application.assistant import valid_preferred_name
from apps.content.application.emotions import (
    EMPATHY_TTL,
    care_cue,
    emotion_from_needs,
    resolve_emotion,
)
from apps.content.domain.denkynho import DenkynhoCareActionKind as Action
from apps.content.domain.repositories import IDenkynhoRepository
from apps.content.domain.wardrobe import UNLOCKS, wardrobe_state
from common.architecture.base import UnitOfWork, UseCase
from common.architecture.exceptions import ConflictError, ValidationDomainError

_DECAY_INTERVAL = timedelta(minutes=30)
_DAILY_VISIT_XP = 8
_DECAY = {"satiety": 4, "energy": 3, "happiness": 2, "hygiene": 2}
_EFFECTS = {
    Action.FEED: ({"satiety": 32, "happiness": 5}, 12),
    Action.SLEEP: ({"energy": 35}, 10),
    Action.PLAY: ({"satiety": -8, "energy": -12, "happiness": 28}, 18),
    Action.CARE: ({"happiness": 18}, 12),
    Action.BATH: ({"hygiene": 30, "happiness": 6}, 12),
    Action.WALK: ({"energy": -5, "happiness": 8}, 8),
    Action.DANCE: ({"satiety": -5, "energy": -10, "happiness": 20}, 16),
}
_SATURATED_MESSAGES = {
    Action.FEED: "O Denkynho já está satisfeito.",
    Action.SLEEP: "O Denkynho já descansou bastante.",
    Action.PLAY: "O Denkynho já está muito feliz para brincar agora.",
    Action.CARE: "O Denkynho já está bem cuidado.",
    Action.BATH: "O Denkynho já está limpo.",
    Action.DANCE: "O Denkynho já está muito feliz para dançar agora.",
}


def _emotion_state(profile, now) -> dict:
    """Calcula o humor visível a partir da empatia ainda válida ou das necessidades."""

    needs = emotion_from_needs(profile.satiety, profile.energy, profile.happiness, profile.hygiene)
    return resolve_emotion(
        needs=needs,
        empathy=profile.empathy,
        empathy_expires_at=profile.empathy_expires_at,
        now=now,
    )


def _apply_empathy(profile, affect: str | None, now) -> bool:
    """Grava, limpa ou deixa expirar a empatia sem armazenar o texto da mensagem."""

    if affect == "calm":
        if not profile.empathy and profile.empathy_expires_at is None:
            return False
        profile.empathy = ""
        profile.empathy_expires_at = None
        return True
    if affect:
        profile.empathy = affect
        profile.empathy_expires_at = now + EMPATHY_TTL
        return True
    if profile.empathy and (profile.empathy_expires_at is None or profile.empathy_expires_at <= now):
        profile.empathy = ""
        profile.empathy_expires_at = None
        return True
    return False


def _serialize(profile, now=None, visit_xp: int = 0) -> dict:
    """Expõe somente o estado necessário para desenhar o mascote autenticado."""

    current = now or timezone.now()
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
        "emotion": _emotion_state(profile, current),
        "preferences": {"preferred_name": profile.preferred_name, "detail": profile.detail},
        "cue": care_cue(profile.satiety, profile.energy, profile.happiness, profile.hygiene),
        "daily_visit": visit_xp > 0,
        "visit_xp": visit_xp,
        **wardrobe_state(profile),
    }


def _apply_decay(profile, now) -> bool:
    """Aplica períodos completos de desgaste e preserva o tempo restante para a próxima vez."""

    elapsed = now - profile.last_decay_at
    periods = max(0, elapsed // _DECAY_INTERVAL)
    if not periods:
        return False
    for attribute, amount in _DECAY.items():
        setattr(profile, attribute, max(0, getattr(profile, attribute) - amount * periods))
    profile.last_decay_at += _DECAY_INTERVAL * periods
    return True


def _apply_daily_visit(profile, now) -> int:
    """Concede um bônus leve na primeira visita do dia, sem streak punitiva."""

    today = timezone.localdate(now)
    if profile.last_visit_on == today:
        return 0
    _add_experience(profile, _DAILY_VISIT_XP)
    profile.last_visit_on = today
    return _DAILY_VISIT_XP


def _add_experience(profile, amount: int) -> None:
    """Soma XP do mascote usando a mesma curva progressiva exibida no painel."""

    profile.experience += amount
    while profile.experience >= xp_for_level(profile.level):
        profile.experience -= xp_for_level(profile.level)
        profile.level += 1


def _validate_action(profile, action: str) -> None:
    """Evita XP sem cuidado efetivo e bloqueia brincadeira quando faltam necessidades básicas."""

    if action not in _EFFECTS:
        raise ValidationDomainError("Este cuidado não existe.")
    if action == Action.DANCE and profile.level < 3:
        raise ValidationDomainError("Dançar juntos é liberado no nível 3.")
    if action == Action.WALK:
        if profile.energy < 5:
            raise ValidationDomainError("O Denkynho precisa descansar antes de caminhar.")
        return
    if action in {Action.PLAY, Action.DANCE}:
        effects, _ = _EFFECTS[action]
        if profile.energy < -effects["energy"]:
            raise ValidationDomainError("O Denkynho precisa descansar antes de brincar.")
        if profile.satiety < -effects["satiety"]:
            raise ValidationDomainError("O Denkynho precisa comer antes de brincar.")
    target = {
        Action.FEED: "satiety",
        Action.SLEEP: "energy",
        Action.PLAY: "happiness",
        Action.CARE: "happiness",
        Action.BATH: "hygiene",
        Action.DANCE: "happiness",
    }[action]
    if getattr(profile, target) >= 100:
        raise ValidationDomainError(_SATURATED_MESSAGES[action])


def _persist_living_state(profile, now, affect: str | None = None) -> bool:
    """Aplica desgaste e empatia e grava somente quando algum desses estados mudou."""

    decayed = _apply_decay(profile, now)
    empathy_changed = _apply_empathy(profile, affect, now)
    if not (decayed or empathy_changed):
        return False
    fields = ["updated_at"]
    if decayed:
        fields.extend([*list(_DECAY), "last_decay_at"])
    if empathy_changed:
        fields.extend(["empathy", "empathy_expires_at"])
    profile.save(update_fields=fields)
    return True


def remember_user_affect(
    user_id: UUID,
    affect: str | None,
    *,
    repo: IDenkynhoRepository,
    unit_of_work: UnitOfWork,
) -> dict:
    """Atualiza a empatia do mascote da conta e devolve o humor visível atual."""

    user = repo.require_user(user_id)
    now = timezone.now()
    with unit_of_work:
        profile = repo.get_locked_profile(user)
        _persist_living_state(profile, now, affect)
        return _emotion_state(profile, now)


@dataclass(frozen=True, slots=True)
class CareDenkynhoInput:
    """Dados validados para um cuidado idempotente do mascote da sessão."""

    user_id: UUID
    action: str
    idempotency_key: UUID


class GetDenkynhoProfileUseCase(UseCase[UUID, dict]):
    """Carrega e atualiza o desgaste natural do Denkynho do usuário solicitado."""

    def __init__(self, denkynho: IDenkynhoRepository, unit_of_work: UnitOfWork) -> None:
        self._denkynho = denkynho
        self._unit_of_work = unit_of_work

    def execute(self, user_id: UUID) -> dict:
        user = self._denkynho.require_user(user_id)
        now = timezone.now()
        with self._unit_of_work:
            profile = self._denkynho.get_locked_profile(user)
            visit_xp = _apply_daily_visit(profile, now)
            decayed = _apply_decay(profile, now)
            empathy_changed = _apply_empathy(profile, None, now)
            if visit_xp or decayed or empathy_changed:
                fields = ["updated_at"]
                if visit_xp:
                    fields.extend(["experience", "level", "last_visit_on"])
                if decayed:
                    fields.extend([*list(_DECAY), "last_decay_at"])
                if empathy_changed:
                    fields.extend(["empathy", "empathy_expires_at"])
                profile.save(update_fields=fields)
            return _serialize(profile, now, visit_xp=visit_xp)


@dataclass(frozen=True, slots=True)
class UpdateDenkynhoPreferencesInput:
    """Nome e tamanho das respostas persistidos no mascote, sem histórico de chat."""

    user_id: UUID
    preferred_name: str
    detail: str


class UpdateDenkynhoPreferencesUseCase(UseCase[UpdateDenkynhoPreferencesInput, dict]):
    """Grava preferências explícitas da conta; vazio esquece o apelido."""

    def __init__(self, denkynho: IDenkynhoRepository, unit_of_work: UnitOfWork) -> None:
        self._denkynho = denkynho
        self._unit_of_work = unit_of_work

    def execute(self, data: UpdateDenkynhoPreferencesInput) -> dict:
        if data.detail not in {"brief", "balanced", "detailed"}:
            raise ValidationDomainError("Escolha respostas curtas, equilibradas ou detalhadas.")
        if not valid_preferred_name(data.preferred_name):
            raise ValidationDomainError("Use um nome de até 30 letras, sem termos ofensivos.")
        user = self._denkynho.require_user(data.user_id)
        now = timezone.now()
        with self._unit_of_work:
            profile = self._denkynho.get_locked_profile(user)
            _persist_living_state(profile, now)
            profile.preferred_name = data.preferred_name
            profile.detail = data.detail
            profile.save(update_fields=["preferred_name", "detail", "updated_at"])
            return _serialize(profile, now)


class CareDenkynhoUseCase(UseCase[CareDenkynhoInput, dict]):
    """Aplica um cuidado, limita atributos e grava sua chave para que retries não dupliquem XP."""

    def __init__(self, denkynho: IDenkynhoRepository, unit_of_work: UnitOfWork) -> None:
        self._denkynho = denkynho
        self._unit_of_work = unit_of_work

    def execute(self, data: CareDenkynhoInput) -> dict:
        user = self._denkynho.require_user(data.user_id)
        with self._unit_of_work:
            profile = self._denkynho.get_locked_profile(user)
            previous = self._denkynho.find_care_action(profile, data.idempotency_key)
            if previous is not None:
                if previous.action != data.action:
                    raise ConflictError("Esta chave de solicitação já foi usada para outra ação.")
                return {
                    **_serialize(profile),
                    "action": previous.action,
                    "xp_gained": previous.xp_gained,
                    "replayed": True,
                    "level_up": False,
                    "unlocked": [],
                    "attributes_gained": {},
                }

            now = timezone.now()
            _apply_decay(profile, now)
            _apply_empathy(profile, None, now)
            _validate_action(profile, data.action)
            previous_level = profile.level
            previous_attributes = {attribute: getattr(profile, attribute) for attribute in _DECAY}
            effects, experience = _EFFECTS[data.action]
            for attribute, change in effects.items():
                setattr(profile, attribute, min(100, max(0, getattr(profile, attribute) + change)))
            _add_experience(profile, experience)
            profile.save(update_fields=[
                *list(_DECAY), "experience", "level", "last_decay_at",
                "empathy", "empathy_expires_at", "updated_at",
            ])
            self._denkynho.create_care_action(
                profile,
                idempotency_key=data.idempotency_key,
                action=data.action,
                xp_gained=experience,
            )
            return {
                **_serialize(profile),
                "action": data.action,
                "xp_gained": experience,
                "replayed": False,
                "level_up": profile.level > previous_level,
                "unlocked": [item["id"] for item in UNLOCKS if previous_level < item["level"] <= profile.level],
                "attributes_gained": {
                    attribute: getattr(profile, attribute) - previous_attributes[attribute]
                    for attribute in _DECAY if getattr(profile, attribute) != previous_attributes[attribute]
                },
            }
