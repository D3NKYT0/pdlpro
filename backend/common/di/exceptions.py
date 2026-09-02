from __future__ import annotations

from collections.abc import Callable
from typing import Any

from .lifetime import Lifetime


class UnregisteredServiceError(LookupError):
    """Indica que a porta solicitada não foi registrada em nenhum container pai.

    Consulte ``interface`` para identificar o registro que falta no provider; tipos concretos
    também precisam de ``register_self`` antes da resolução.
    """

    def __init__(self, interface: type) -> None:
        name = getattr(interface, "__name__", str(interface))
        super().__init__(f"Serviço não registrado no container: {name}")
        self.interface = interface


class CircularDependencyError(RuntimeError):
    """Sinaliza um ciclo entre construtores durante a resolução de serviços.

    ``chain`` contém os nomes percorridos até a repetição. Quebre o ciclo nas dependências de
    aplicação em vez de tentar resolver novamente o mesmo tipo.
    """

    def __init__(self, chain: list[str]) -> None:
        super().__init__("Dependência circular: " + " -> ".join(chain))
        self.chain = chain


class MissingAnnotationError(TypeError):
    """Indica parâmetro obrigatório sem um tipo utilizável pela injeção.

    Adicione um type hint resolvível ao construtor ou à factory e registre a porta
    correspondente. Parâmetros opcionais não são injetados pelo container.
    """

    def __init__(self, cls: type, parameter: str) -> None:
        super().__init__(
            f"{cls.__name__}.{parameter} não possui anotação de tipo. "
            "Toda dependência injetada precisa de type hint."
        )


class ServiceDescriptor:
    """Descrição interna de um registro de injeção de dependência.

    Guarda porta, implementação, factory, instância e lifetime usados por ``Container``. Prefira
    criar registros por ``Container.register``; uma instância fornecida tem prioridade sobre
    factory e implementação.
    """

    __slots__ = ("factory", "implementation", "instance", "interface", "lifetime")

    def __init__(
        self,
        interface: type,
        *,
        implementation: type | None = None,
        factory: Callable[..., Any] | None = None,
        instance: Any = None,
        lifetime: Lifetime = Lifetime.TRANSIENT,
    ) -> None:
        self.interface = interface
        self.implementation = implementation
        self.factory = factory
        self.instance = instance
        self.lifetime = lifetime
