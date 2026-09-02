from __future__ import annotations

import random
from dataclasses import dataclass
from uuid import UUID

from apps.accounts.application.progress import add_xp
from apps.games.application.bag import add_to_bag
from apps.games.application.battle_pass_xp import add_battle_pass_xp
from apps.games.domain.exceptions import GameInactiveError, InsufficientTokensError
from apps.games.infrastructure.models import (
    Fish,
    FishingCatch,
    FishingRod,
    GameConfig,
    UserFishingBait,
)
from common.architecture.base import UnitOfWork, UseCase

SUCCESS_CHANCE = {"common": 85, "rare": 65, "epic": 40, "legendary": 18}


def _config() -> GameConfig:
    row = GameConfig.objects.filter(code="fishing", active=True).first()
    if row is None:
        raise GameInactiveError()
    return row


class GetFishingStateUseCase(UseCase[UUID, dict]):
    def execute(self, data: UUID) -> dict:
        from django.contrib.auth import get_user_model

        user = get_user_model().objects.get(id=data)
        rod, _ = FishingRod.objects.get_or_create(user=user)
        config = GameConfig.objects.filter(code="fishing").first()
        catches = (
            FishingCatch.objects.select_related("fish")
            .filter(user=user)
            .order_by("-created_at")[:8]
        )
        return {
            "fichas": user.fichas,
            "cost": int((config.settings or {}).get("cost_per_cast", 1))
            if config
            else 1,
            "active": bool(config and config.active),
            "rod": {"level": rod.level, "xp": rod.xp},
            "fish": [
                {
                    "id": str(fish.id),
                    "name": fish.name,
                    "rarity": fish.rarity,
                    "min_rod_level": fish.min_rod_level,
                }
                for fish in Fish.objects.filter(active=True)
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
    user_id: UUID
    bait_id: UUID | None = None


class CastLineUseCase(UseCase[CastLineInput, dict]):
    def __init__(self, unit_of_work: UnitOfWork) -> None:
        self._unit_of_work = unit_of_work

    def execute(self, data: CastLineInput) -> dict:
        from django.contrib.auth import get_user_model

        cost = int((_config().settings or {}).get("cost_per_cast", 1))
        with self._unit_of_work:
            user = get_user_model().objects.select_for_update().get(id=data.user_id)
            bonus = 0
            if data.bait_id:
                from rest_framework.exceptions import ValidationError

                stock = (
                    UserFishingBait.objects.select_for_update()
                    .select_related("bait")
                    .filter(user=user, bait__id=data.bait_id, bait__active=True)
                    .first()
                )
                if not stock or stock.quantity < 1:
                    raise ValidationError("Você não possui esta isca.")
                stock.quantity -= 1
                stock.save(update_fields=["quantity", "updated_at"])
                bonus = stock.bait.success_bonus
            if user.fichas < cost:
                raise InsufficientTokensError()
            user.fichas -= cost
            rod, _ = FishingRod.objects.select_for_update().get_or_create(user=user)
            pool = list(Fish.objects.filter(active=True, min_rod_level__lte=rod.level))
            if not pool:
                pool = list(Fish.objects.filter(active=True))
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
                rod.save(update_fields=["xp", "level", "updated_at"])
                if fish.fichas_reward:
                    user.fichas += fish.fichas_reward
                if fish.item_id:
                    add_to_bag(
                        user,
                        item_id=fish.item_id,
                        item_name=fish.item_name or fish.name,
                        enchant=fish.enchant,
                    )
                add_xp(user, 8)
                add_battle_pass_xp(user, 5)
            user.save(update_fields=["fichas", "updated_at"])
            FishingCatch.objects.create(
                user=user, fish=fish, success=success, rod_level=rod.level
            )
        return {
            "success": success,
            "fish": {"name": fish.name, "rarity": fish.rarity} if fish else None,
            "rod": {"level": rod.level, "xp": rod.xp},
            "fichas": user.fichas,
        }
