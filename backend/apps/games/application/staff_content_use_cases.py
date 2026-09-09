from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID

from apps.games.application.rewards import validate_rewards
from apps.games.domain.repositories import IGameContentAdminRepository
from apps.games.infrastructure.staff_content import CONFIG_MODELS
from common.architecture.base import UseCase
from common.architecture.exceptions import EntityNotFoundError, ValidationDomainError


def validate_game_content_fields(
    kind: str,
    data: dict,
    *,
    instance=None,
    content: IGameContentAdminRepository | None = None,
) -> dict:
    """Valida campos numéricos, recompensas, sobreposição de temporadas e dia do bônus diário.

    ``data`` deve conter apenas campos já coeridos (como em ``validated_data`` do serializer).
    Mutates ``data`` quando limpa ``rewards``. Levanta ``ValidationDomainError`` em falhas.
    """

    def value(key):
        return data.get(key, getattr(instance, key, None) if instance is not None else None)

    for key in (
        "target",
        "quantity",
        "required_item_id",
        "item_id",
        "required_quantity",
        "day",
        "weight",
    ):
        if key in data and data[key] is not None and data[key] < 1:
            raise ValidationDomainError("Deve ser maior que zero.", details={key: "Deve ser maior que zero."})
    if "success_bonus" in data and data["success_bonus"] is not None and data["success_bonus"] > 90:
        raise ValidationDomainError(
            "Máximo de 90 pontos percentuais.",
            details={"success_bonus": "Máximo de 90 pontos percentuais."},
        )
    if "rewards" in data:
        data["rewards"] = validate_rewards(data["rewards"])
    for start_key, end_key in (
        ("starts_at", "ends_at"),
        ("starts_on", "ends_on"),
    ):
        start, end = value(start_key), value(end_key)
        if start and end:
            if end < start:
                raise ValidationDomainError("A data final deve ser posterior à inicial.")
            if value("active") is not False and content is not None:
                exclude_id = getattr(instance, "id", None) if instance is not None else None
                if content.has_active_overlap(
                    kind,
                    start_key=start_key,
                    end_key=end_key,
                    start=start,
                    end=end,
                    exclude_id=exclude_id,
                ):
                    raise ValidationDomainError("Já existe uma temporada ativa neste período.")
    if kind == "daily-days" and value("season") and value("day"):
        season = value("season")
        day = value("day")
        if day > (season.ends_on - season.starts_on).days + 1:
            raise ValidationDomainError("O dia está fora da duração da temporada.")
    return data


@dataclass(frozen=True, slots=True)
class ListGameContentInput:
    kind: str


@dataclass(frozen=True, slots=True)
class UpsertGameContentInput:
    kind: str
    validated_data: dict
    entry_id: UUID | None = None


class ListGameContentUseCase(UseCase[ListGameContentInput, list[Any]]):
    """Lista as entradas de configuração do tipo de conteúdo informado.

    Uso: resolva pelo container e chame ``execute`` com ``ListGameContentInput``.
    """

    def __init__(self, content: IGameContentAdminRepository) -> None:
        self._content = content

    def execute(self, data: ListGameContentInput) -> list[Any]:
        if data.kind not in CONFIG_MODELS:
            raise ValidationDomainError("Configuração desconhecida.")
        return self._content.list_kind(data.kind)


class UpsertGameContentUseCase(UseCase[UpsertGameContentInput, Any]):
    """Cria ou atualiza uma entrada de conteúdo de jogos após validação de domínio.

    Uso: resolva pelo container e chame ``execute`` com ``UpsertGameContentInput``. O retorno é
    a linha ORM persistida.
    """

    def __init__(self, content: IGameContentAdminRepository) -> None:
        self._content = content

    def execute(self, data: UpsertGameContentInput) -> Any:
        if data.kind not in CONFIG_MODELS:
            raise ValidationDomainError("Configuração desconhecida.")
        instance = None
        if data.entry_id is not None:
            instance = self._content.get_kind(data.kind, data.entry_id)
            if instance is None:
                raise EntityNotFoundError("Entrada de configuração não encontrada.")
        payload = validate_game_content_fields(
            data.kind,
            dict(data.validated_data),
            instance=instance,
            content=self._content,
        )
        if data.entry_id is None:
            return self._content.create(data.kind, payload)
        return self._content.update(data.kind, data.entry_id, payload)


# Re-export helpers used by presentation serializers.
__all__ = [
    "ListGameContentInput",
    "ListGameContentUseCase",
    "UpsertGameContentInput",
    "UpsertGameContentUseCase",
    "validate_game_content_fields",
]
