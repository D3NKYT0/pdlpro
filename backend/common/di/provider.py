from __future__ import annotations

from abc import ABC, abstractmethod

from .container import Container


class AppProvider(ABC):
    """Cada app Django registra suas portas e adaptadores aqui."""

    @abstractmethod
    def register(self, container: Container) -> None:
        raise NotImplementedError
