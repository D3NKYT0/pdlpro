"""Personalização gratuita e privada do Denkynho autenticado."""

from dataclasses import dataclass
from uuid import UUID

from django.contrib.auth import get_user_model
from django.db import transaction

from apps.content.application.denkynho import _locked_profile, _serialize
from apps.content.domain.wardrobe import APPEARANCE_SLOTS, UNLOCKS
from common.architecture.base import UseCase
from common.architecture.exceptions import ValidationDomainError


@dataclass(frozen=True, slots=True)
class EquipDenkynhoInput:
    """Seleciona ou remove uma peça de um espaço do mascote da sessão."""

    user_id: UUID
    slot: str
    item_id: str


class EquipDenkynhoUseCase(UseCase[EquipDenkynhoInput, dict]):
    """Persiste uma seleção liberada sob bloqueio; repetir a seleção não concede XP."""

    def execute(self, data: EquipDenkynhoInput) -> dict:
        if data.slot not in APPEARANCE_SLOTS:
            raise ValidationDomainError("Este espaço do armário não existe.")
        user = get_user_model().objects.get(id=data.user_id)
        with transaction.atomic():
            profile = _locked_profile(user)
            if data.item_id:
                item = next((item for item in UNLOCKS if item["id"] == data.item_id and item["slot"] == data.slot), None)
                if item is None:
                    raise ValidationDomainError("Esta peça não pertence a este espaço do armário.")
                if item["level"] > profile.level:
                    raise ValidationDomainError(f"Esta peça é liberada no nível {item['level']}.")
            appearance = {**_serialize(profile)["appearance"], data.slot: data.item_id}
            if profile.appearance != appearance:
                profile.appearance = appearance
                profile.save(update_fields=["appearance", "updated_at"])
            return _serialize(profile)
