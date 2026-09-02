from __future__ import annotations

from .container import Container
from .lifetime import Lifetime
from .provider import AppProvider


class ApplicationCatalog:
    """Reúne os providers que compõem o container da aplicação.

    ``add`` ignora registros repetidos da mesma classe de provider. ``compose`` chama
    ``register`` na ordem de inclusão; registros posteriores da mesma porta substituem os
    descritores anteriores no container.
    """

    def __init__(self) -> None:
        self._providers: list[AppProvider] = []

    def add(self, provider: AppProvider) -> None:
        """Inclui um provider apenas se não houver outro da mesma classe."""

        provider_type = type(provider)
        if any(type(existing) is provider_type for existing in self._providers):
            return
        self._providers.append(provider)

    def compose(self, container: Container) -> None:
        """Aplica todos os providers ao container, na ordem de registro."""

        for provider in self._providers:
            provider.register(container)


class DependencyInjection:
    """Ponto de composição e acesso ao container raiz do processo.

    Registre providers em ``AppConfig.ready()`` com ``add_provider``. A primeira chamada a
    ``root()`` monta o container; chamadas seguintes o reutilizam. Adicionar um provider
    invalida a raiz atual. Para requisições ou tarefas, resolva serviços em
    ``root().create_scope()``. ``reset`` é reservado a testes e remove também o catálogo,
    exigindo registrar os providers de novo.
    """

    _root: Container | None = None
    _catalog = ApplicationCatalog()
    _built = False

    @classmethod
    def add_provider(cls, provider: AppProvider) -> None:
        """Inclui o provider e invalida a raiz para recompô-la no próximo acesso."""

        cls._catalog.add(provider)
        cls._built = False
        cls._root = None

    @classmethod
    def build(cls) -> Container:
        """Cria uma nova raiz, aplica o catálogo e substitui o container global."""

        container = Container()
        container.register(Container, instance=container, lifetime=Lifetime.SINGLETON)
        cls._catalog.compose(container)
        cls._root = container
        cls._built = True
        return container

    @classmethod
    def root(cls) -> Container:
        """Retorna a raiz compartilhada, compondo os providers no primeiro acesso."""

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
