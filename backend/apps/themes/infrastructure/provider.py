from apps.themes.application.use_cases import (
    ActivateThemeUseCase,
    DeleteThemeUseCase,
    GetActiveThemeUseCase,
    InstallThemeUseCase,
    ListThemesUseCase,
)
from common.di.container import Container
from common.di.lifetime import Lifetime
from common.di.provider import AppProvider


class ThemesProvider(AppProvider):
    """Registra os casos de uso do módulo themes.

    O AppConfig inclui este provider no catálogo de DependencyInjection. Acrescente novos
    registros em ``register`` e escolha o lifetime conforme o estado mantido pelo serviço; views
    resolvem essas classes pelo container.
    """

    def register(self, container: Container) -> None:
        for use_case in (
            GetActiveThemeUseCase,
            ListThemesUseCase,
            InstallThemeUseCase,
            ActivateThemeUseCase,
            DeleteThemeUseCase,
        ):
            container.register_self(use_case, lifetime=Lifetime.TRANSIENT)
