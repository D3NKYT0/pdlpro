from apps.staff.application.audit import ListAuditLogsUseCase
from apps.staff.application.cms import (
    DeleteStaffBannerUseCase,
    DeleteStaffCalendarUseCase,
    DeleteStaffDownloadUseCase,
    DeleteStaffFaqUseCase,
    DeleteStaffWikiUseCase,
    ListStaffBannersUseCase,
    ListStaffCalendarUseCase,
    ListStaffDownloadsUseCase,
    ListStaffFaqUseCase,
    ListStaffWikiUseCase,
    UpsertStaffBannerUseCase,
    UpsertStaffCalendarUseCase,
    UpsertStaffDownloadUseCase,
    UpsertStaffFaqUseCase,
    UpsertStaffWikiUseCase,
)
from apps.staff.application.financial_reports import GetFinancialReportUseCase
from apps.staff.application.integrations import (
    GetIntegrationsStatusUseCase,
    PatchIntegrationSectionUseCase,
    TestIntegrationSectionUseCase,
)
from apps.staff.application.metrics import GetMetricsDashboardUseCase
from apps.staff.application.notifications import (
    DeleteStaffNotificationUseCase,
    ListStaffNotificationsUseCase,
    SendStaffNotificationUseCase,
)
from apps.staff.application.observability import PruneObservabilityLogsUseCase
from apps.staff.application.operational_reports import GetOperationalReportUseCase
from apps.staff.application.secrets import (
    ApplySecretRotationJobUseCase,
    AutoSecretMaintenanceUseCase,
    GetSecretsStatusUseCase,
    RequestSecretActionUseCase,
)
from apps.staff.application.use_cases import (
    DeleteStaffBonusTierUseCase,
    DeleteStaffChargeCurrencyUseCase,
    DeleteStaffCoinPackageUseCase,
    GetPanelSettingsUseCase,
    GetStaffCoinConfigUseCase,
    GetStaffWalletPromoUseCase,
    ListStaffBonusTiersUseCase,
    ListStaffChargeCurrenciesUseCase,
    ListStaffCoinPackagesUseCase,
    ListStaffGamesUseCase,
    ListStaffNewsUseCase,
    ListStaffServicePricesUseCase,
    ListStaffShopItemsUseCase,
    PreviewStaffBonusSimulationUseCase,
    ToggleStaffGameUseCase,
    UpdatePanelSettingsUseCase,
    UpdateStaffCoinConfigUseCase,
    UpdateStaffWalletPromoUseCase,
    UpsertStaffBonusTierUseCase,
    UpsertStaffChargeCurrencyUseCase,
    UpsertStaffCoinPackageUseCase,
    UpsertStaffNewsUseCase,
    UpsertStaffServicePricesUseCase,
    UpsertStaffShopItemUseCase,
)
from apps.staff.domain.audit import IAuditLogReadRepository
from apps.staff.domain.financial_reports import IFinancialReportRepository
from apps.staff.domain.integrations import (
    IIntegrationConfigStore,
    IIntegrationProbe,
    IRuntimeSettingsApplier,
)
from apps.staff.domain.metrics import IMetricsRepository
from apps.staff.domain.observability import IObservabilityLogRepository
from apps.staff.domain.operational_reports import IOperationalReportRepository
from apps.staff.domain.secrets import (
    IGlobalSessionRevoker,
    ISealedDataReencryptor,
    ISecretRotationJobStore,
    ISecretsEnvStore,
)
from apps.staff.infrastructure.audit import DjangoAuditLogReadRepository
from apps.staff.infrastructure.financial_reports import DjangoFinancialReportRepository
from apps.staff.infrastructure.integrations import (
    DjangoIntegrationConfigStore,
    DjangoIntegrationProbe,
    DjangoRuntimeSettingsApplier,
)
from apps.staff.infrastructure.metrics import DjangoMetricsRepository
from apps.staff.infrastructure.observability import DjangoObservabilityLogRepository
from apps.staff.infrastructure.operational_reports import (
    DjangoOperationalReportRepository,
)
from apps.staff.infrastructure.secrets import (
    DjangoGlobalSessionRevoker,
    DjangoSealedDataReencryptor,
    DjangoSecretRotationJobStore,
    DjangoSecretsEnvStore,
)
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
        container.register(IAuditLogReadRepository, DjangoAuditLogReadRepository, lifetime=Lifetime.SCOPED)
        container.register(IFinancialReportRepository, DjangoFinancialReportRepository, lifetime=Lifetime.SCOPED)
        container.register(
            IOperationalReportRepository, DjangoOperationalReportRepository, lifetime=Lifetime.SCOPED
        )
        container.register(
            IObservabilityLogRepository, DjangoObservabilityLogRepository, lifetime=Lifetime.SCOPED
        )
        container.register(IMetricsRepository, DjangoMetricsRepository, lifetime=Lifetime.SCOPED)
        container.register(ISecretsEnvStore, DjangoSecretsEnvStore, lifetime=Lifetime.SCOPED)
        container.register(ISealedDataReencryptor, DjangoSealedDataReencryptor, lifetime=Lifetime.SCOPED)
        container.register(IGlobalSessionRevoker, DjangoGlobalSessionRevoker, lifetime=Lifetime.SCOPED)
        container.register(ISecretRotationJobStore, DjangoSecretRotationJobStore, lifetime=Lifetime.SCOPED)
        container.register(IIntegrationConfigStore, DjangoIntegrationConfigStore, lifetime=Lifetime.SCOPED)
        container.register(IRuntimeSettingsApplier, DjangoRuntimeSettingsApplier, lifetime=Lifetime.SCOPED)
        container.register(IIntegrationProbe, DjangoIntegrationProbe, lifetime=Lifetime.SCOPED)
        for use_case in (
            ListAuditLogsUseCase,
            GetMetricsDashboardUseCase,
            GetFinancialReportUseCase,
            GetOperationalReportUseCase,
            PruneObservabilityLogsUseCase,
            GetSecretsStatusUseCase,
            RequestSecretActionUseCase,
            ApplySecretRotationJobUseCase,
            AutoSecretMaintenanceUseCase,
            GetIntegrationsStatusUseCase,
            PatchIntegrationSectionUseCase,
            TestIntegrationSectionUseCase,
            GetPanelSettingsUseCase,
            UpdatePanelSettingsUseCase,
            ListStaffServicePricesUseCase,
            UpsertStaffServicePricesUseCase,
            GetStaffCoinConfigUseCase,
            UpdateStaffCoinConfigUseCase,
            GetStaffWalletPromoUseCase,
            UpdateStaffWalletPromoUseCase,
            ListStaffBonusTiersUseCase,
            UpsertStaffBonusTierUseCase,
            DeleteStaffBonusTierUseCase,
            PreviewStaffBonusSimulationUseCase,
            ListStaffCoinPackagesUseCase,
            UpsertStaffCoinPackageUseCase,
            DeleteStaffCoinPackageUseCase,
            ListStaffChargeCurrenciesUseCase,
            UpsertStaffChargeCurrencyUseCase,
            DeleteStaffChargeCurrencyUseCase,
            ListStaffShopItemsUseCase,
            UpsertStaffShopItemUseCase,
            ListStaffNewsUseCase,
            UpsertStaffNewsUseCase,
            ListStaffCalendarUseCase,
            UpsertStaffCalendarUseCase,
            DeleteStaffCalendarUseCase,
            ListStaffBannersUseCase,
            UpsertStaffBannerUseCase,
            DeleteStaffBannerUseCase,
            ListStaffFaqUseCase,
            UpsertStaffFaqUseCase,
            DeleteStaffFaqUseCase,
            ListStaffWikiUseCase,
            UpsertStaffWikiUseCase,
            DeleteStaffWikiUseCase,
            ListStaffDownloadsUseCase,
            UpsertStaffDownloadUseCase,
            DeleteStaffDownloadUseCase,
            ListStaffNotificationsUseCase,
            SendStaffNotificationUseCase,
            DeleteStaffNotificationUseCase,
            ListStaffGamesUseCase,
            ToggleStaffGameUseCase,
        ):
            container.register_self(use_case, lifetime=Lifetime.TRANSIENT)
