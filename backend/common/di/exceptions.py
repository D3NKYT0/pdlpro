from __future__ import annotations

from collections.abc import Callable
from typing import Any

from .lifetime import Lifetime


class UnregisteredServiceError(LookupError):
    def __init__(self, interface: type) -> None:
        name = getattr(interface, "__name__", str(interface))
        super().__init__(f"Serviço não registrado no container: {name}")
        self.interface = interface


class CircularDependencyError(RuntimeError):
    def __init__(self, chain: list[str]) -> None:
        super().__init__("Dependência circular: " + " -> ".join(chain))
        self.chain = chain


class MissingAnnotationError(TypeError):
    def __init__(self, cls: type, parameter: str) -> None:
        super().__init__(
            f"{cls.__name__}.{parameter} não possui anotação de tipo. "
            "Toda dependência injetada precisa de type hint."
        )


class ServiceDescriptor:
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
