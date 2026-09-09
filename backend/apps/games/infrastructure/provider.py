from apps.games.application.advanced_use_cases import (
    BattlePassActionUseCase,
    BuyBaitUseCase,
    ClaimDailyBonusOrSeasonUseCase,
    GetBattlePassDetailsUseCase,
    GetDailyBonusDetailsUseCase,
    GetFishingDetailsUseCase,
    GetGameStatisticsUseCase,
)
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
from apps.games.application.economy_use_cases import (
    EnchantWeaponUseCase,
    FightMonsterUseCase,
    GetEconomyStateUseCase,
)
from apps.games.application.fishing_use_cases import (
    CastLineUseCase,
    GetFishingStateUseCase,
)
from apps.games.application.minigame_use_cases import (
    GetMinigamesStateUseCase,
    PlayDiceUseCase,
    SpinSlotsUseCase,
)
from apps.games.application.staff_content_use_cases import (
    ListGameContentUseCase,
    UpsertGameContentUseCase,
)
from apps.games.application.use_cases import (
    BuyTokensUseCase,
    ClaimDailyBonusUseCase,
    GetBagUseCase,
    GetDailyBonusStateUseCase,
    GetRouletteStateUseCase,
    SpinRouletteUseCase,
)
from apps.games.domain.repositories import (
    IBagRepository,
    IBattlePassRepository,
    IBoxRepository,
    IDailyBonusRepository,
    IEconomyRepository,
    IFishingRepository,
    IGameCatalogRepository,
    IGameConfigAdminRepository,
    IGameContentAdminRepository,
    IMinigameRepository,
)
from apps.games.infrastructure.repositories import (
    DjangoBagRepository,
    DjangoBattlePassRepository,
    DjangoBoxRepository,
    DjangoDailyBonusRepository,
    DjangoEconomyRepository,
    DjangoFishingRepository,
    DjangoGameCatalogRepository,
    DjangoGameConfigAdminRepository,
    DjangoGameContentAdminRepository,
    DjangoMinigameRepository,
)
from common.di.container import Container
from common.di.lifetime import Lifetime
from common.di.provider import AppProvider


class GamesProvider(AppProvider):
    """Registra portas, adaptadores e casos de uso do módulo games.

    O AppConfig inclui este provider no catálogo de DependencyInjection. Acrescente novos
    registros em ``register`` e escolha o lifetime conforme o estado mantido pelo serviço; views
    resolvem essas classes pelo container.
    """

    def register(self, container: Container) -> None:
        container.register(
            IGameConfigAdminRepository, DjangoGameConfigAdminRepository, lifetime=Lifetime.SCOPED
        )
        container.register(
            IGameContentAdminRepository, DjangoGameContentAdminRepository, lifetime=Lifetime.SCOPED
        )
        container.register(
            IGameCatalogRepository, DjangoGameCatalogRepository, lifetime=Lifetime.SCOPED
        )
        container.register(IBagRepository, DjangoBagRepository, lifetime=Lifetime.SCOPED)
        container.register(IBoxRepository, DjangoBoxRepository, lifetime=Lifetime.SCOPED)
        container.register(
            IMinigameRepository, DjangoMinigameRepository, lifetime=Lifetime.SCOPED
        )
        container.register(
            IFishingRepository, DjangoFishingRepository, lifetime=Lifetime.SCOPED
        )
        container.register(
            IEconomyRepository, DjangoEconomyRepository, lifetime=Lifetime.SCOPED
        )
        container.register(
            IDailyBonusRepository, DjangoDailyBonusRepository, lifetime=Lifetime.SCOPED
        )
        container.register(
            IBattlePassRepository, DjangoBattlePassRepository, lifetime=Lifetime.SCOPED
        )
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
            GetBattlePassDetailsUseCase,
            BattlePassActionUseCase,
            GetDailyBonusDetailsUseCase,
            ClaimDailyBonusOrSeasonUseCase,
            GetFishingDetailsUseCase,
            BuyBaitUseCase,
            GetGameStatisticsUseCase,
            ListGameContentUseCase,
            UpsertGameContentUseCase,
        ):
            container.register_self(use_case, lifetime=Lifetime.TRANSIENT)
