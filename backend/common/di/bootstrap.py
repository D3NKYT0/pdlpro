from __future__ import annotations

from .container import Container
from .lifetime import Lifetime
from .provider import AppProvider


class ApplicationCatalog:
    def __init__(self) -> None:
        self._providers: list[AppProvider] = []

    def add(self, provider: AppProvider) -> None:
        provider_type = type(provider)
        if any(type(existing) is provider_type for existing in self._providers):
            return
        self._providers.append(provider)

    def compose(self, container: Container) -> None:
        for provider in self._providers:
            provider.register(container)


class DependencyInjection:
    """Ponto único de composição da aplicação."""

    _root: Container | None = None
    _catalog = ApplicationCatalog()
    _built = False

    @classmethod
    def add_provider(cls, provider: AppProvider) -> None:
        cls._catalog.add(provider)
        cls._built = False
        cls._root = None

    @classmethod
    def build(cls) -> Container:
        container = Container()
        container.register(Container, instance=container, lifetime=Lifetime.SINGLETON)
        cls._catalog.compose(container)
        cls._root = container
        cls._built = True
        return container

    @classmethod
    def root(cls) -> Container:
        if cls._root is None or not cls._built:
            cls.build()
        assert cls._root is not None
        return cls._root

    @classmethod
    def reset(cls) -> None:
        """Usado em testes. Não chamar em runtime de produção."""
        cls._root = None
        cls._built = False
        cls._catalog = ApplicationCatalog()
