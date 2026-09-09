from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from django.contrib.auth import get_user_model

from apps.games.application import advanced
from apps.games.application.use_cases import (
    ClaimDailyBonusInput,
    ClaimDailyBonusUseCase,
)
from apps.wallet.domain.repositories import IWalletRepository
from common.architecture.base import UseCase


@dataclass(frozen=True, slots=True)
class BattlePassDetailsInput:
    """Consulta detalhes da temporada ativa do passe de batalha."""

    user_id: UUID


class GetBattlePassDetailsUseCase(UseCase[BattlePassDetailsInput, dict]):
    """Detalhes de missões, trocas e marcos da temporada ativa."""

    def execute(self, data: BattlePassDetailsInput) -> dict:
        user = get_user_model().objects.get(id=data.user_id)
        return advanced.battle_details(user)


@dataclass(frozen=True, slots=True)
class BattlePassActionInput:
    """Ação extra do passe (quest, exchange, milestone, auto-claim)."""

    user_id: UUID
    action: str
    entry_id: str | None = None
    enabled: bool = False


class BattlePassActionUseCase(UseCase[BattlePassActionInput, dict]):
    """Executa ações do passe de batalha com crédito via porta de carteira."""

    def __init__(self, wallets: IWalletRepository) -> None:
        self._wallets = wallets

    def execute(self, data: BattlePassActionInput) -> dict:
        return advanced.battle_action(
            data.user_id,
            data.action,
            data.entry_id,
            data.enabled,
            wallets=self._wallets,
        )


@dataclass(frozen=True, slots=True)
class DailyBonusDetailsInput:
    """Consulta detalhes da temporada de bônus diário."""

    user_id: UUID


class GetDailyBonusDetailsUseCase(UseCase[DailyBonusDetailsInput, dict]):
    """Detalhes da season de bônus diário, se ativa."""

    def execute(self, data: DailyBonusDetailsInput) -> dict:
        user = get_user_model().objects.get(id=data.user_id)
        return advanced.daily_details(user)


class ClaimDailyBonusOrSeasonUseCase(UseCase[ClaimDailyBonusInput, dict]):
    """Resgata bônus diário de season quando houver; senão usa o fluxo legado."""

    def __init__(
        self,
        wallets: IWalletRepository,
        claim_daily_bonus: ClaimDailyBonusUseCase,
    ) -> None:
        self._wallets = wallets
        self._claim_daily_bonus = claim_daily_bonus

    def execute(self, data: ClaimDailyBonusInput) -> dict:
        if advanced.daily_season():
            return advanced.claim_daily_season(data.user_id, wallets=self._wallets)
        return self._claim_daily_bonus.execute(data)


@dataclass(frozen=True, slots=True)
class FishingDetailsInput:
    """Consulta iscas, estoque e coleção de peixes do jogador."""

    user_id: UUID


class GetFishingDetailsUseCase(UseCase[FishingDetailsInput, dict]):
    """Monta o painel de pesca (iscas ativas, estoque e coleção)."""

    def execute(self, data: FishingDetailsInput) -> dict:
        from django.db.models import Count

        from apps.games.infrastructure.models import (
            Fish,
            FishingBait,
            FishingCatch,
            UserFishingBait,
        )

        user = get_user_model().objects.get(id=data.user_id)
        stock = dict(
            UserFishingBait.objects.filter(user=user).values_list("bait_id", "quantity")
        )
        catches = dict(
            FishingCatch.objects.filter(user=user, success=True)
            .values("fish_id")
            .annotate(total=Count("pk"))
            .values_list("fish_id", "total")
        )
        return {
            "baits": [
                {
                    "id": str(b.id),
                    "name": b.name,
                    "description": b.description,
                    "price": b.price,
                    "success_bonus": b.success_bonus,
                    "quantity": stock.get(b.pk, 0),
                }
                for b in FishingBait.objects.filter(active=True)
            ],
            "collection": [
                {
                    "id": str(f.id),
                    "name": f.name,
                    "rarity": f.rarity,
                    "count": catches.get(f.pk, 0),
                }
                for f in Fish.objects.filter(active=True)
            ],
        }


@dataclass(frozen=True, slots=True)
class BuyBaitInput:
    """Compra iscas de pesca com fichas."""

    user_id: UUID
    bait_id: str
    quantity: int


class BuyBaitUseCase(UseCase[BuyBaitInput, dict]):
    """Compra iscas ativas quando a pesca estiver habilitada."""

    def execute(self, data: BuyBaitInput) -> dict:
        return advanced.buy_bait(data.user_id, data.bait_id, data.quantity)


@dataclass(frozen=True, slots=True)
class GameStatisticsInput:
    """Estatísticas e leaderboard por tipo de minijogo."""

    user_id: UUID
    kind: str


class GetGameStatisticsUseCase(UseCase[GameStatisticsInput, dict]):
    """Agrega jogadas, vitórias e ranking do jogo informado."""

    def execute(self, data: GameStatisticsInput) -> dict:
        user = get_user_model().objects.get(id=data.user_id)
        return advanced.game_statistics(user, data.kind)
