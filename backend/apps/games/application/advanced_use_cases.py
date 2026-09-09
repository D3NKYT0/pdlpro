from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from apps.games.application import advanced
from apps.games.application.use_cases import (
    ClaimDailyBonusInput,
    ClaimDailyBonusUseCase,
)
from apps.games.domain.repositories import (
    IBagRepository,
    IBattlePassRepository,
    IDailyBonusRepository,
    IFishingRepository,
    IMinigameRepository,
)
from apps.wallet.domain.repositories import IWalletRepository
from common.architecture.base import UnitOfWork, UseCase


@dataclass(frozen=True, slots=True)
class BattlePassDetailsInput:
    """Consulta detalhes da temporada ativa do passe de batalha."""

    user_id: UUID


class GetBattlePassDetailsUseCase(UseCase[BattlePassDetailsInput, dict]):
    """Detalhes de missões, trocas e marcos da temporada ativa."""

    def __init__(
        self,
        battle_pass: IBattlePassRepository,
        bags: IBagRepository,
        minigames: IMinigameRepository,
    ) -> None:
        self._battle_pass = battle_pass
        self._bags = bags
        self._minigames = minigames

    def execute(self, data: BattlePassDetailsInput) -> dict:
        user = self._battle_pass.require_user(data.user_id)
        return advanced.battle_details(
            user,
            battle_pass=self._battle_pass,
            bags=self._bags,
            minigames=self._minigames,
        )


@dataclass(frozen=True, slots=True)
class BattlePassActionInput:
    """Ação extra do passe (quest, exchange, milestone, auto-claim)."""

    user_id: UUID
    action: str
    entry_id: str | None = None
    enabled: bool = False


class BattlePassActionUseCase(UseCase[BattlePassActionInput, dict]):
    """Executa ações do passe de batalha com crédito via porta de carteira."""

    def __init__(
        self,
        wallets: IWalletRepository,
        battle_pass: IBattlePassRepository,
        bags: IBagRepository,
        minigames: IMinigameRepository,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._wallets = wallets
        self._battle_pass = battle_pass
        self._bags = bags
        self._minigames = minigames
        self._unit_of_work = unit_of_work

    def execute(self, data: BattlePassActionInput) -> dict:
        return advanced.battle_action(
            data.user_id,
            data.action,
            data.entry_id,
            data.enabled,
            wallets=self._wallets,
            battle_pass=self._battle_pass,
            bags=self._bags,
            minigames=self._minigames,
            unit_of_work=self._unit_of_work,
        )


@dataclass(frozen=True, slots=True)
class DailyBonusDetailsInput:
    """Consulta detalhes da temporada de bônus diário."""

    user_id: UUID


class GetDailyBonusDetailsUseCase(UseCase[DailyBonusDetailsInput, dict]):
    """Detalhes da season de bônus diário, se ativa."""

    def __init__(self, daily_bonus: IDailyBonusRepository) -> None:
        self._daily_bonus = daily_bonus

    def execute(self, data: DailyBonusDetailsInput) -> dict:
        user = self._daily_bonus.require_user(data.user_id)
        return advanced.daily_details(user, daily_bonus=self._daily_bonus)


class ClaimDailyBonusOrSeasonUseCase(UseCase[ClaimDailyBonusInput, dict]):
    """Resgata bônus diário de season quando houver; senão usa o fluxo legado."""

    def __init__(
        self,
        wallets: IWalletRepository,
        claim_daily_bonus: ClaimDailyBonusUseCase,
        daily_bonus: IDailyBonusRepository,
        bags: IBagRepository,
        battle_pass: IBattlePassRepository,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._wallets = wallets
        self._claim_daily_bonus = claim_daily_bonus
        self._daily_bonus = daily_bonus
        self._bags = bags
        self._battle_pass = battle_pass
        self._unit_of_work = unit_of_work

    def execute(self, data: ClaimDailyBonusInput) -> dict:
        if self._daily_bonus.active_season():
            return advanced.claim_daily_season(
                data.user_id,
                wallets=self._wallets,
                daily_bonus=self._daily_bonus,
                bags=self._bags,
                battle_pass=self._battle_pass,
                unit_of_work=self._unit_of_work,
            )
        return self._claim_daily_bonus.execute(data)


@dataclass(frozen=True, slots=True)
class FishingDetailsInput:
    """Consulta iscas, estoque e coleção de peixes do jogador."""

    user_id: UUID


class GetFishingDetailsUseCase(UseCase[FishingDetailsInput, dict]):
    """Monta o painel de pesca (iscas ativas, estoque e coleção)."""

    def __init__(self, fishing: IFishingRepository) -> None:
        self._fishing = fishing

    def execute(self, data: FishingDetailsInput) -> dict:
        user = self._fishing.require_user(data.user_id)
        stock = self._fishing.bait_stock_map(user)
        catches = self._fishing.catch_collection_map(user)
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
                for b in self._fishing.list_active_baits()
            ],
            "collection": [
                {
                    "id": str(f.id),
                    "name": f.name,
                    "rarity": f.rarity,
                    "count": catches.get(f.pk, 0),
                }
                for f in self._fishing.list_active_fish()
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

    def __init__(self, fishing: IFishingRepository, unit_of_work: UnitOfWork) -> None:
        self._fishing = fishing
        self._unit_of_work = unit_of_work

    def execute(self, data: BuyBaitInput) -> dict:
        return advanced.buy_bait(
            data.user_id,
            data.bait_id,
            data.quantity,
            fishing=self._fishing,
            unit_of_work=self._unit_of_work,
        )


@dataclass(frozen=True, slots=True)
class GameStatisticsInput:
    """Estatísticas e leaderboard por tipo de minijogo."""

    user_id: UUID
    kind: str


class GetGameStatisticsUseCase(UseCase[GameStatisticsInput, dict]):
    """Agrega jogadas, vitórias e ranking do jogo informado."""

    def __init__(self, minigames: IMinigameRepository) -> None:
        self._minigames = minigames

    def execute(self, data: GameStatisticsInput) -> dict:
        user = self._minigames.require_user(data.user_id)
        return advanced.game_statistics(user, data.kind, minigames=self._minigames)
