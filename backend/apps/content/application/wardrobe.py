"""Personalização gratuita e privada do Denkynho autenticado."""

from dataclasses import dataclass
from uuid import UUID

from apps.content.application.denkynho import _serialize
from apps.content.domain.repositories import IDenkynhoRepository
from apps.content.domain.wardrobe import APPEARANCE_SLOTS, UNLOCKS
from common.architecture.base import UnitOfWork, UseCase
from common.architecture.exceptions import ValidationDomainError


@dataclass(frozen=True, slots=True)
class EquipDenkynhoInput:
    """Seleciona ou remove uma peça de um espaço do mascote da sessão."""

    user_id: UUID
    slot: str
    item_id: str


class EquipDenkynhoUseCase(UseCase[EquipDenkynhoInput, dict]):
    """Persiste uma seleção liberada sob bloqueio; repetir a seleção não concede XP."""

    def __init__(self, denkynho: IDenkynhoRepository, unit_of_work: UnitOfWork) -> None:
        self._denkynho = denkynho
        self._unit_of_work = unit_of_work

    def execute(self, data: EquipDenkynhoInput) -> dict:
        if data.slot not in APPEARANCE_SLOTS:
            raise ValidationDomainError("Este espaço do armário não existe.")
        user = self._denkynho.require_user(data.user_id)
        with self._unit_of_work:
            profile = self._denkynho.get_locked_profile(user)
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
