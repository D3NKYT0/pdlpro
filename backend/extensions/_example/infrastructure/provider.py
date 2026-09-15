from extensions._example.application.hooks import ExampleCheckoutHook
from extensions._example.application.use_cases import PingExtensionUseCase
from extensions.surface import AppProvider, Container, IHookBus, Lifetime


class ExampleExtensionProvider(AppProvider):
    """Registra casos de uso e ganchos da extensão de exemplo no container de DI."""

    def register(self, container: Container) -> None:
        container.register_self(PingExtensionUseCase, lifetime=Lifetime.TRANSIENT)
        container.resolve(IHookBus).add(ExampleCheckoutHook())
