from apps.staff.application.financial_reports import GetFinancialReportUseCase
from apps.staff.application.use_cases import (
    GetPanelSettingsUseCase,
    GetStaffCoinConfigUseCase,
    GetStaffWalletPromoUseCase,
    ListStaffGamesUseCase,
    ListStaffNewsUseCase,
    ListStaffServicePricesUseCase,
    ListStaffShopItemsUseCase,
    ToggleStaffGameUseCase,
    UpdatePanelSettingsUseCase,
    UpdateStaffCoinConfigUseCase,
    UpdateStaffWalletPromoUseCase,
    UpsertStaffNewsUseCase,
    UpsertStaffServicePricesUseCase,
    UpsertStaffShopItemUseCase,
)
from apps.staff.domain.financial_reports import IFinancialReportRepository
from apps.staff.infrastructure.financial_reports import DjangoFinancialReportRepository
from common.di.container import Container
from common.di.lifetime import Lifetime
from common.di.provider import AppProvider


class StaffProvider(AppProvider):
    """Registra portas, adaptadores e casos de uso do módulo staff.

    O AppConfig inclui este provider no catálogo de DependencyInjection. Acrescente novos
    registros em ``register`` e escolha o lifetime conforme o estado mantido pelo serviço; views
    resolvem essas classes pelo container.
    """

    def register(self, container: Container) -> None:
        container.register(IFinancialReportRepository, DjangoFinancialReportRepository, lifetime=Lifetime.SCOPED)
        for use_case in (
            GetFinancialReportUseCase,
            GetPanelSettingsUseCase,
            UpdatePanelSettingsUseCase,
            ListStaffServicePricesUseCase,
            UpsertStaffServicePricesUseCase,
            GetStaffCoinConfigUseCase,
            UpdateStaffCoinConfigUseCase,
            GetStaffWalletPromoUseCase,
            UpdateStaffWalletPromoUseCase,
            ListStaffShopItemsUseCase,
            UpsertStaffShopItemUseCase,
            ListStaffNewsUseCase,
            UpsertStaffNewsUseCase,
            ListStaffGamesUseCase,
            ToggleStaffGameUseCase,
        ):
            container.register_self(use_case, lifetime=Lifetime.TRANSIENT)
