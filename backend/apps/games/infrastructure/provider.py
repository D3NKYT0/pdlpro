from apps.games.application.battle_pass_use_cases import (
    BuyBattlePassPremiumUseCase,
    ClaimBattlePassRewardUseCase,
    GetBattlePassUseCase,
)
from apps.games.application.box_use_cases import (
    BuyBoxUseCase,
    ListBoxTypesUseCase,
    OpenBoxUseCase,
    TransferBagToInventoryUseCase,
)
from apps.games.application.economy_use_cases import EnchantWeaponUseCase, FightMonsterUseCase, GetEconomyStateUseCase
from apps.games.application.fishing_use_cases import CastLineUseCase, GetFishingStateUseCase
from apps.games.application.minigame_use_cases import GetMinigamesStateUseCase, PlayDiceUseCase, SpinSlotsUseCase
from apps.games.application.use_cases import (
    BuyTokensUseCase,
    ClaimDailyBonusUseCase,
    GetBagUseCase,
    GetDailyBonusStateUseCase,
    GetRouletteStateUseCase,
    SpinRouletteUseCase,
)
from common.di.container import Container
from common.di.lifetime import Lifetime
from common.di.provider import AppProvider


class GamesProvider(AppProvider):
    def register(self, container: Container) -> None:
        for use_case in (
            GetRouletteStateUseCase,
            SpinRouletteUseCase,
            BuyTokensUseCase,
            ClaimDailyBonusUseCase,
            GetDailyBonusStateUseCase,
            GetBagUseCase,
            ListBoxTypesUseCase,
            BuyBoxUseCase,
            OpenBoxUseCase,
            TransferBagToInventoryUseCase,
            GetMinigamesStateUseCase,
            PlayDiceUseCase,
            SpinSlotsUseCase,
            GetFishingStateUseCase,
            CastLineUseCase,
            GetEconomyStateUseCase,
            FightMonsterUseCase,
            EnchantWeaponUseCase,
            GetBattlePassUseCase,
            ClaimBattlePassRewardUseCase,
            BuyBattlePassPremiumUseCase,
        ):
            container.register_self(use_case, lifetime=Lifetime.TRANSIENT)
