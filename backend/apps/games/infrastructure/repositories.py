from __future__ import annotations

from typing import Any
from uuid import UUID

from apps.games.domain.repositories import IGameConfigAdminRepository, IGameContentAdminRepository
from apps.games.infrastructure.models import GameConfig
from apps.games.infrastructure.staff_content import CONFIG_MODELS, get_config_model
from common.architecture.exceptions import EntityNotFoundError, ValidationDomainError


class DjangoGameConfigAdminRepository(IGameConfigAdminRepository):
    """Adaptador Django de ``IGameConfigAdminRepository`` para GameConfig."""

    def list_all(self) -> list[GameConfig]:
        return list(GameConfig.objects.all().order_by("name"))

    def get_by_id(self, config_id: UUID) -> GameConfig | None:
        return GameConfig.objects.filter(id=config_id).first()

    def get_by_code(self, code: str) -> GameConfig | None:
        return GameConfig.objects.filter(code=code).first()

    def save(self, row: GameConfig) -> GameConfig:
        row.save()
        return row


class DjangoGameContentAdminRepository(IGameContentAdminRepository):
    """Adaptador Django de ``IGameContentAdminRepository`` para o conteúdo staff dos jogos."""

    def _model(self, kind: str):
        model = get_config_model(kind)
        if model is None:
            raise ValidationDomainError("Configuração desconhecida.")
        return model

    def list_kind(self, kind: str) -> list[Any]:
        return list(self._model(kind).objects.all())

    def get_kind(self, kind: str, entry_id: UUID) -> Any | None:
        return self._model(kind).objects.filter(id=entry_id).first()

    def create(self, kind: str, validated_data: dict) -> Any:
        if kind not in CONFIG_MODELS:
            raise ValidationDomainError("Configuração desconhecida.")
        return self._model(kind).objects.create(**validated_data)

    def update(self, kind: str, entry_id: UUID, validated_data: dict) -> Any:
        row = self.get_kind(kind, entry_id)
        if row is None:
            raise EntityNotFoundError("Entrada de configuração não encontrada.")
        for key, value in validated_data.items():
            setattr(row, key, value)
        row.save()
        return row

    def has_active_overlap(
        self,
        kind: str,
        *,
        start_key: str,
        end_key: str,
        start,
        end,
        exclude_id: UUID | None = None,
    ) -> bool:
        model = self._model(kind)
        overlapping = model.objects.filter(
            **{
                f"{start_key}__lte": end,
                f"{end_key}__gte": start,
                "active": True,
            }
        )
        if exclude_id is not None:
            overlapping = overlapping.exclude(id=exclude_id)
        return overlapping.exists()
