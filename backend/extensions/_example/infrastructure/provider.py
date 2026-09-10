from extensions._example.application.use_cases import PingExtensionUseCase
from extensions.surface import AppProvider, Container, Lifetime


class ExampleExtensionProvider(AppProvider):
    """Registra casos de uso da extensão de exemplo no container de DI."""

    def register(self, container: Container) -> None:
        container.register_self(PingExtensionUseCase, lifetime=Lifetime.TRANSIENT)
