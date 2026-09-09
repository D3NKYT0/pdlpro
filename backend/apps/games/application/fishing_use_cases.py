from __future__ import annotations

import random
from dataclasses import dataclass
from uuid import UUID

from apps.accounts.application.progress import add_xp
from apps.accounts.domain.repositories import IProgressRepository
from apps.games.application.bag import add_to_bag
from apps.games.application.battle_pass_xp import add_battle_pass_xp
from apps.games.domain.exceptions import GameInactiveError, InsufficientTokensError
from apps.games.domain.repositories import (
    IBagRepository,
    IBattlePassRepository,
    IFishingRepository,
)
from common.architecture.base import UnitOfWork, UseCase
from common.architecture.exceptions import ValidationDomainError

SUCCESS_CHANCE = {"common": 85, "rare": 65, "epic": 40, "legendary": 18}


class GetFishingStateUseCase(UseCase[UUID, dict]):
    """Retorna configuração, vara, peixes ativos e capturas recentes; cria a vara inicial se
    necessário.

    Uso: resolva pelo container e chame ``execute(data)`` com ``UUID``. O retorno é ``dict``.
    """

    def __init__(self, fishing: IFishingRepository) -> None:
        self._fishing = fishing

    def execute(self, data: UUID) -> dict:
        user = self._fishing.require_user(data)
        rod = self._fishing.get_or_create_rod(user)
        config = self._fishing.get_config()
        catches = self._fishing.list_recent_catches(user)
        return {
            "fichas": user.fichas,
            "cost": int((config.settings or {}).get("cost_per_cast", 1)) if config else 1,
            "active": bool(config and config.active),
            "rod": {"level": rod.level, "xp": rod.xp},
            "fish": [
                {
                    "id": str(fish.id),
                    "name": fish.name,
                    "rarity": fish.rarity,
                    "min_rod_level": fish.min_rod_level,
                }
                for fish in self._fishing.list_active_fish()
            ],
            "recent": [
                {
                    "success": row.success,
                    "fish": row.fish.name if row.fish else None,
                    "created_at": row.created_at.isoformat(),
                }
                for row in catches
            ],
        }


@dataclass(frozen=True, slots=True)
class CastLineInput:
    """Dados de entrada de ``CastLineUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    user_id: UUID
    bait_id: UUID | None = None


class CastLineUseCase(UseCase[CastLineInput, dict]):
    """Consome fichas e eventual isca, sorteia a captura, atualiza a vara e registra prêmios e
    progresso.

    Uso: resolva pelo container e chame ``execute(data)`` com ``CastLineInput``. O retorno é
    ``dict``.
    """

    def __init__(
        self,
        fishing: IFishingRepository,
        bags: IBagRepository,
        progress: IProgressRepository,
        battle_pass: IBattlePassRepository,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._fishing = fishing
        self._bags = bags
        self._progress = progress
        self._battle_pass = battle_pass
        self._unit_of_work = unit_of_work

    def execute(self, data: CastLineInput) -> dict:
        config = self._fishing.get_config()
        if config is None or not config.active:
            raise GameInactiveError()
        cost = int((config.settings or {}).get("cost_per_cast", 1))
        with self._unit_of_work:
            user = self._fishing.require_user_locked(data.user_id)
            bonus = 0
            if data.bait_id:
                stock = self._fishing.get_bait_stock_locked(user, data.bait_id)
                if not stock or stock.quantity < 1:
                    raise ValidationDomainError("Você não possui esta isca.")
                stock.quantity -= 1
                self._fishing.save_bait_stock(
                    stock, update_fields=["quantity", "updated_at"]
                )
                bonus = stock.bait.success_bonus
            if user.fichas < cost:
                raise InsufficientTokensError()
            user.fichas -= cost
            rod = self._fishing.get_or_create_rod_locked(user)
            pool = self._fishing.list_fish_for_rod(rod.level)
            if not pool:
                pool = self._fishing.list_active_fish()
            fish = (
                random.choices(
                    pool, weights=[max(item.weight, 1) for item in pool], k=1
                )[0]
                if pool
                else None
            )
            chance = SUCCESS_CHANCE.get(fish.rarity, 70) if fish else 0
            chance = min(95, chance + rod.level * 2 + bonus)
            success = bool(fish) and random.randint(1, 100) <= chance
            if success and fish:
                rod.xp += fish.xp_reward
                while rod.xp >= rod.level * 100:
                    rod.xp -= rod.level * 100
                    rod.level += 1
                self._fishing.save_rod(rod, update_fields=["xp", "level", "updated_at"])
                if fish.fichas_reward:
                    user.fichas += fish.fichas_reward
                if fish.item_id:
                    add_to_bag(
                        user,
                        item_id=fish.item_id,
                        item_name=fish.item_name or fish.name,
                        enchant=fish.enchant,
                        bags=self._bags,
                    )
                add_xp(user, 8, self._progress)
                add_battle_pass_xp(
                    user, 5, battle_pass=self._battle_pass, bags=self._bags
                )
            user.save(update_fields=["fichas", "updated_at"])
            self._fishing.create_catch(
                user=user, fish=fish, success=success, rod_level=rod.level
            )
        return {
            "success": success,
            "fish": {"name": fish.name, "rarity": fish.rarity} if fish else None,
            "rod": {"level": rod.level, "xp": rod.xp},
            "fichas": user.fichas,
        }
