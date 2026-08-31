from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID

from django.utils import timezone

from apps.games.application.bag import add_to_bag
from apps.games.infrastructure.models import (
    BattlePassLevel,
    BattlePassReward,
    BattlePassSeason,
    UserBattlePassClaim,
    UserBattlePassProgress,
)
from apps.wallet.domain.repositories import IWalletRepository
from common.architecture.base import UnitOfWork, UseCase
from common.architecture.exceptions import EntityNotFoundError, ValidationDomainError


def _active_season() -> BattlePassSeason | None:
    now = timezone.now()
    return (
        BattlePassSeason.objects.filter(active=True, starts_at__lte=now, ends_at__gte=now).first()
        or BattlePassSeason.objects.filter(active=True).first()
    )


def _current_level(progress: UserBattlePassProgress) -> int:
    row = (
        BattlePassLevel.objects.filter(season=progress.season, required_xp__lte=progress.xp)
        .order_by("-level")
        .first()
    )
    return row.level if row else 0


class GetBattlePassUseCase(UseCase[UUID, dict]):
    def execute(self, data: UUID) -> dict:
        from django.contrib.auth import get_user_model

        season = _active_season()
        if season is None:
            return {"season": None, "levels": []}
        user = get_user_model().objects.get(id=data)
        progress, _ = UserBattlePassProgress.objects.get_or_create(user=user, season=season)
        claimed = set(UserBattlePassClaim.objects.filter(user=user).values_list("reward_id", flat=True))
        current = _current_level(progress)
        levels = []
        for row in BattlePassLevel.objects.filter(season=season).prefetch_related("rewards"):
            levels.append(
                {
                    "level": row.level,
                    "required_xp": row.required_xp,
                    "unlocked": current >= row.level,
                    "rewards": [
                        {
                            "id": str(reward.id),
                            "is_premium": reward.is_premium,
                            "item_name": reward.item_name,
                            "quantity": reward.quantity,
                            "description": reward.description,
                            "claimed": reward.pk in claimed,
                            "locked_premium": reward.is_premium and not progress.has_premium,
                        }
                        for reward in row.rewards.all()
                    ],
                }
            )
        return {
            "season": {
                "id": str(season.id),
                "name": season.name,
                "premium_price": str(season.premium_price),
                "ends_at": season.ends_at.isoformat(),
            },
            "xp": progress.xp,
            "has_premium": progress.has_premium,
            "current_level": current,
            "levels": levels,
        }


@dataclass(frozen=True, slots=True)
class ClaimBattlePassRewardInput:
    user_id: UUID
    reward_id: UUID


class ClaimBattlePassRewardUseCase(UseCase[ClaimBattlePassRewardInput, dict]):
    def execute(self, data: ClaimBattlePassRewardInput) -> dict:
        from django.contrib.auth import get_user_model

        reward = BattlePassReward.objects.select_related("level_row", "level_row__season").filter(id=data.reward_id).first()
        if reward is None:
            raise EntityNotFoundError("Recompensa do passe não encontrada.")
        user = get_user_model().objects.get(id=data.user_id)
        progress, _ = UserBattlePassProgress.objects.get_or_create(user=user, season=reward.level_row.season)
        if _current_level(progress) < reward.level_row.level:
            raise ValidationDomainError("Nível do passe insuficiente.")
        if reward.is_premium and not progress.has_premium:
            raise ValidationDomainError("Compre o passe premium para este prêmio.")
        if UserBattlePassClaim.objects.filter(user=user, reward=reward).exists():
            raise ValidationDomainError("Recompensa já resgatada.")
        add_to_bag(
            user,
            item_id=reward.item_id,
            item_name=reward.item_name,
            enchant=reward.enchant,
            quantity=reward.quantity,
        )
        UserBattlePassClaim.objects.create(user=user, reward=reward)
        return {"claimed": True, "item_name": reward.item_name}


@dataclass(frozen=True, slots=True)
class BuyBattlePassPremiumInput:
    user_id: UUID


class BuyBattlePassPremiumUseCase(UseCase[BuyBattlePassPremiumInput, dict]):
    def __init__(self, wallets: IWalletRepository, unit_of_work: UnitOfWork) -> None:
        self._wallets = wallets
        self._unit_of_work = unit_of_work

    def execute(self, data: BuyBattlePassPremiumInput) -> dict:
        from django.contrib.auth import get_user_model

        season = _active_season()
        if season is None:
            raise EntityNotFoundError("Nenhuma temporada ativa.")
        with self._unit_of_work:
            user = get_user_model().objects.get(id=data.user_id)
            progress, _ = UserBattlePassProgress.objects.get_or_create(user=user, season=season)
            if progress.has_premium:
                raise ValidationDomainError("Você já tem o passe premium.")
            wallet = self._wallets.get_or_create(data.user_id)
            self._wallets.debit(
                wallet.id,
                Decimal(season.premium_price),
                destination="battle_pass",
                description=f"Passe premium {season.name}",
            )
            progress.has_premium = True
            progress.save(update_fields=["has_premium", "updated_at"])
        return {"has_premium": True}
