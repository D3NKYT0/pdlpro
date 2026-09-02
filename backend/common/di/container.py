from __future__ import annotations

import inspect
from collections.abc import Callable
from typing import Any, TypeVar, get_type_hints

from .exceptions import (
    CircularDependencyError,
    MissingAnnotationError,
    ServiceDescriptor,
    UnregisteredServiceError,
)
from .lifetime import Lifetime

T = TypeVar("T")


class Container:
    """Resolve serviços por tipos anotados no construtor ou na factory.

    Registre portas com ``register(Porta, Adaptador)`` e classes concretas com
    ``register_self(CasoDeUso)`` antes de chamar ``resolve(Tipo)``. Parâmetros com valor padrão
    são deixados para o construtor; os obrigatórios precisam de anotações de tipo resolvíveis e
    de registro, mesmo sendo concretos.

    SINGLETON reutiliza a instância no container raiz; SCOPED reutiliza no container em que se
    resolve; TRANSIENT cria a cada chamada. Abra escopos com ``create_scope()`` para isolar
    requisições. Não injete serviços SCOPED em singletons: essa dependência ficaria retida além
    do seu escopo. O container não fecha conexões nem executa finalizadores automaticamente.
    """

    def __init__(self, parent: Container | None = None) -> None:
        self._parent = parent
        self._registry: dict[type, ServiceDescriptor] = {}
        self._instances: dict[type, Any] = {}
        self._resolving: list[type] = []

    def register(
        self,
        interface: type[T],
        implementation: type[T] | None = None,
        *,
        factory: Callable[..., T] | None = None,
        instance: T | None = None,
        lifetime: Lifetime = Lifetime.TRANSIENT,
    ) -> Container:
        """Registra uma porta e devolve o container para encadear configurações.

        Forneça implementação, factory ou instância. Uma instância explícita força SINGLETON;
        sem alternativa, a própria interface é usada como implementação. Configure os registros
        antes das resoluções, pois substituir um descritor não limpa instâncias já armazenadas
        em todos os escopos.
        """

        if instance is not None:
            lifetime = Lifetime.SINGLETON
            self._instances[interface] = instance
        self._registry[interface] = ServiceDescriptor(
            interface,
            implementation=implementation or (None if factory or instance is not None else interface),
            factory=factory,
            instance=instance,
            lifetime=lifetime,
        )
        return self

    def register_self(
        self,
        implementation: type[T],
        *,
        lifetime: Lifetime = Lifetime.TRANSIENT,
    ) -> Container:
        """Registra uma classe concreta para resolução pelo próprio tipo."""

        return self.register(implementation, implementation, lifetime=lifetime)

    def create_scope(self) -> Container:
        """Cria um filho que herda os registros e mantém seu cache de serviços SCOPED.

        O próprio tipo Container resolve para esse filho. Criar o escopo não abre transação de
        banco nem cria antecipadamente as dependências.
        """

        child = Container(parent=self)
        child.register(Container, instance=child)
        return child

    def is_registered(self, interface: type) -> bool:
        """Informa se a porta possui registro neste container ou em algum pai."""

        return self._find(interface) is not None

    def resolve(self, interface: type[T]) -> T:
        """Obtém a instância da porta, criando e injetando dependências se necessário.

        Pode lançar UnregisteredServiceError, MissingAnnotationError ou CircularDependencyError
        quando a configuração dos construtores é inválida. O lifetime determina em qual cache a
        instância será reutilizada.
        """

        descriptor = self._find(interface)
        if descriptor is None:
            raise UnregisteredServiceError(interface)

        if descriptor.lifetime is Lifetime.SINGLETON:
            root = self._root()
            cached = root._instances.get(interface)
            if cached is not None:
                return cached
            created = self._create(descriptor)
            root._instances[interface] = created
            return created

        if descriptor.lifetime is Lifetime.SCOPED:
            cached = self._instances.get(interface)
            if cached is not None:
                return cached
            created = self._create(descriptor)
            self._instances[interface] = created
            return created

        return self._create(descriptor)

    def _find(self, interface: type) -> ServiceDescriptor | None:
        current: Container | None = self
        while current is not None:
            descriptor = current._registry.get(interface)
            if descriptor is not None:
                return descriptor
            current = current._parent
        return None

    def _root(self) -> Container:
        current = self
        while current._parent is not None:
            current = current._parent
        return current

    def _create(self, descriptor: ServiceDescriptor) -> Any:
        if descriptor.instance is not None:
            return descriptor.instance
        if descriptor.factory is not None:
            return self._invoke(descriptor.factory)
        if descriptor.implementation is None:
            raise UnregisteredServiceError(descriptor.interface)
        return self._construct(descriptor.implementation)

    def _construct(self, cls: type) -> Any:
        if cls in self._resolving:
            names = [item.__name__ for item in self._resolving] + [cls.__name__]
            raise CircularDependencyError(names)
        self._resolving.append(cls)
        try:
            return self._invoke(cls)
        finally:
            self._resolving.pop()

    def _invoke(self, target: Callable[..., Any]) -> Any:
        construct = inspect.isclass(target)
        annotated = target.__init__ if construct else target
        try:
            hints = get_type_hints(annotated)
        except Exception:
            hints = getattr(annotated, "__annotations__", {}) or {}

        signature = inspect.signature(annotated)
        kwargs: dict[str, Any] = {}
        for name, parameter in signature.parameters.items():
            if name == "self":
                continue
            if parameter.kind in (
                inspect.Parameter.VAR_POSITIONAL,
                inspect.Parameter.VAR_KEYWORD,
            ):
                continue
            if parameter.default is not inspect.Parameter.empty:
                # Parâmetros opcionais preservam o default; só os obrigatórios entram na DI.
                continue
            annotation = hints.get(name, parameter.annotation)
            if annotation is inspect.Parameter.empty or isinstance(annotation, str):
                owner = getattr(target, "__name__", str(target))
                raise MissingAnnotationError(type("Hint", (), {"__name__": owner}), name)
            kwargs[name] = self.resolve(annotation)
        return target(**kwargs)
