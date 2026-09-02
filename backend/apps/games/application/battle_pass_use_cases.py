from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID

from django.utils import timezone
from django.db import transaction

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
    return BattlePassSeason.objects.filter(
        active=True, starts_at__lte=now, ends_at__gte=now
    ).first()


def _current_level(progress: UserBattlePassProgress) -> int:
    row = (
        BattlePassLevel.objects.filter(
            season=progress.season, required_xp__lte=progress.xp
        )
        .order_by("-level")
        .first()
    )
    return row.level if row else 0


class GetBattlePassUseCase(UseCase[UUID, dict]):
    """Monta a temporada ativa, o progresso e os níveis do passe; pode criar o progresso inicial do
    jogador.

    Uso: resolva pelo container e chame ``execute(data)`` com ``UUID``. O retorno é ``dict``.
    """

    def execute(self, data: UUID) -> dict:
        from django.contrib.auth import get_user_model

        season = _active_season()
        if season is None:
            return {"season": None, "levels": []}
        user = get_user_model().objects.get(id=data)
        progress, _ = UserBattlePassProgress.objects.get_or_create(
            user=user, season=season
        )
        claimed = set(
            UserBattlePassClaim.objects.filter(user=user).values_list(
                "reward_id", flat=True
            )
        )
        current = _current_level(progress)
        levels = []
        for row in BattlePassLevel.objects.filter(season=season).prefetch_related(
            "rewards"
        ):
            levels.append(
                {
                    "level": row.level,
                    "required_xp": row.required_xp,
                    "unlocked": progress.xp >= row.required_xp,
                    "rewards": [
                        {
                            "id": str(reward.id),
                            "is_premium": reward.is_premium,
                            "item_id": reward.item_id,
                            "item_name": reward.item_name,
                            "quantity": reward.quantity,
                            "description": reward.description,
                            "claimed": reward.pk in claimed,
                            "locked_premium": reward.is_premium
                            and not progress.has_premium,
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
    """Dados de entrada de ``ClaimBattlePassRewardUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    user_id: UUID
    reward_id: UUID


class ClaimBattlePassRewardUseCase(UseCase[ClaimBattlePassRewardInput, dict]):
    """Valida temporada, nível, acesso premium e resgate anterior, entrega o item na bag e registra
    o prêmio.

    Uso: resolva pelo container e chame ``execute(data)`` com ``ClaimBattlePassRewardInput``. O
    retorno é ``dict``.
    """

    @transaction.atomic
    def execute(self, data: ClaimBattlePassRewardInput) -> dict:
        from django.contrib.auth import get_user_model

        reward = (
            BattlePassReward.objects.select_related("level_row", "level_row__season")
            .filter(id=data.reward_id)
            .first()
        )
        if reward is None:
            raise EntityNotFoundError("Recompensa do passe não encontrada.")
        user = get_user_model().objects.select_for_update().get(id=data.user_id)
        season = reward.level_row.season
        if (
            not season.active
            or not season.starts_at <= timezone.now() <= season.ends_at
        ):
            raise ValidationDomainError("Esta temporada não está ativa.")
        progress, _ = UserBattlePassProgress.objects.get_or_create(
            user=user, season=reward.level_row.season
        )
        if progress.xp < reward.level_row.required_xp:
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
        from apps.games.infrastructure.models import GameRewardLog

        GameRewardLog.objects.create(
            user=user,
            season=season,
            kind="reward",
            source=reward.id,
            label=reward.item_name,
            rewards=[
                {
                    "kind": "item",
                    "item_id": reward.item_id,
                    "name": reward.item_name,
                    "quantity": reward.quantity,
                    "enchant": reward.enchant,
                }
            ],
        )
        return {
            "claimed": True,
            "item_id": reward.item_id,
            "item_name": reward.item_name,
        }


@dataclass(frozen=True, slots=True)
class BuyBattlePassPremiumInput:
    """Dados de entrada de ``BuyBattlePassPremiumUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    user_id: UUID


class BuyBattlePassPremiumUseCase(UseCase[BuyBattlePassPremiumInput, dict]):
    """Debita a carteira e habilita o passe premium da temporada ativa, aplicando o resgate
    automático quando previsto.

    Uso: resolva pelo container e chame ``execute(data)`` com ``BuyBattlePassPremiumInput``. O
    retorno é ``dict``.
    """

    def __init__(self, wallets: IWalletRepository, unit_of_work: UnitOfWork) -> None:
        self._wallets = wallets
        self._unit_of_work = unit_of_work

    def execute(self, data: BuyBattlePassPremiumInput) -> dict:
        from django.contrib.auth import get_user_model

        season = _active_season()
        if season is None:
            raise EntityNotFoundError("Nenhuma temporada ativa.")
        with self._unit_of_work:
            user = get_user_model().objects.select_for_update().get(id=data.user_id)
            progress, _ = UserBattlePassProgress.objects.get_or_create(
                user=user, season=season
            )
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
            if progress.auto_claim:
                auto_claim_rewards(user, progress)
        return {"has_premium": True}


def auto_claim_rewards(user, progress):
    rewards = BattlePassReward.objects.filter(
        level_row__season=progress.season, level_row__required_xp__lte=progress.xp
    ).exclude(claims__user=user)
    if not progress.has_premium:
        rewards = rewards.filter(is_premium=False)
    for reward in rewards:
        ClaimBattlePassRewardUseCase().execute(
            ClaimBattlePassRewardInput(user_id=user.id, reward_id=reward.id)
        )
