from extensions.surface import AppProvider, Lifetime
from extensions.valorem.application.use_cases import GetValoremWikiStatusUseCase


class ValoremExtensionProvider(AppProvider):
    """Provedor de injeção de dependência da extensão Valorem."""

    def register(self, container):
        container.register_self(
            GetValoremWikiStatusUseCase,
            lifetime=Lifetime.TRANSIENT,
        )

