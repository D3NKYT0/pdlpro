"""Barramento de ganchos para extensões se encaixarem em fluxos do core.

O core publica eventos nomeados após o UnitOfWork confirmar. Extensões registram
``IHookHandler`` no ``IHookBus`` (DI). Falha no handler é registrada e não desfaz
a operação de dinheiro já gravada.
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any, ClassVar

logger = logging.getLogger(__name__)


class HookNames:
    """Nomes estáveis publicados pelo core. Bump no changelog se mudar o payload."""

    CHECKOUT_COMPLETED = "checkout.completed"
    PAYMENT_SETTLED = "payment.settled"
    ACCOUNT_LINKED = "account.linked"


@dataclass(frozen=True, slots=True)
class HookEvent:
    """Evento publicado após uma operação do core concluir."""

    name: str
    payload: Mapping[str, Any]


class IHookHandler(ABC):
    """Ouvinte de um ou mais eventos. Declare ``names`` com os ``HookNames`` aceitos."""

    names: ClassVar[frozenset[str]] = frozenset()

    @abstractmethod
    def handle(self, event: HookEvent) -> None:
        """Reage ao evento. Não deve assumir rollback do UnitOfWork do core."""

        raise NotImplementedError


class IHookBus(ABC):
    """Publica eventos e acumula handlers de extensões."""

    @abstractmethod
    def add(self, handler: IHookHandler) -> None:
        """Inclui um ouvinte. Chamado no ``AppProvider.register`` da extensão."""

        raise NotImplementedError

    @abstractmethod
    def publish(self, name: str, payload: Mapping[str, Any] | None = None) -> None:
        """Entrega o evento a todos os handlers que declaram ``name``."""

        raise NotImplementedError


class InProcessHookBus(IHookBus):
    """Barramento em memória, singleton do processo."""

    def __init__(self) -> None:
        self._handlers: list[IHookHandler] = []

    def add(self, handler: IHookHandler) -> None:
        if handler not in self._handlers:
            self._handlers.append(handler)

    def publish(self, name: str, payload: Mapping[str, Any] | None = None) -> None:
        event = HookEvent(name=name, payload=dict(payload or {}))
        for handler in list(self._handlers):
            if name not in getattr(handler, "names", ()):
                continue
            try:
                handler.handle(event)
            except Exception:
                logger.exception("Handler %s falhou no gancho %s", type(handler).__name__, name)


class NullHookBus(IHookBus):
    """No-op para testes que instanciam o caso de uso sem DI."""

    def add(self, handler: IHookHandler) -> None:
        return None

    def publish(self, name: str, payload: Mapping[str, Any] | None = None) -> None:
        return None
