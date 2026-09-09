from apps.themes.application.use_cases import (
    ActivateThemeUseCase,
    DeleteThemeUseCase,
    GetActiveThemeUseCase,
    InstallThemeUseCase,
    ListThemesUseCase,
)
from apps.themes.domain.repositories import IThemePackageRepository
from apps.themes.infrastructure.repositories import DjangoThemePackageRepository
from common.di.container import Container
from common.di.lifetime import Lifetime
from common.di.provider import AppProvider


class ThemesProvider(AppProvider):
    """Registra portas, adaptadores e casos de uso do módulo themes.

    O AppConfig inclui este provider no catálogo de DependencyInjection. Acrescente novos
    registros em ``register`` e escolha o lifetime conforme o estado mantido pelo serviço; views
    resolvem essas classes pelo container.
    """

    def register(self, container: Container) -> None:
        container.register(
            IThemePackageRepository, DjangoThemePackageRepository, lifetime=Lifetime.SCOPED
        )
        for use_case in (
            GetActiveThemeUseCase,
            ListThemesUseCase,
            InstallThemeUseCase,
            ActivateThemeUseCase,
            DeleteThemeUseCase,
        ):
            container.register_self(use_case, lifetime=Lifetime.TRANSIENT)
