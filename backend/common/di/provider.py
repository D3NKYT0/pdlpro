from __future__ import annotations

from abc import ABC, abstractmethod

from .container import Container


class AppProvider(ABC):
    """Contrato de registro das dependências de um app.

    Implemente ``register(container)`` associando portas aos adaptadores e registrando os casos
    de uso. Adicione o provider em ``AppConfig.ready()`` via
    ``DependencyInjection.add_provider``. Escolha explicitamente o lifetime e evite executar
    regras de negócio durante a composição.
    """

    @abstractmethod
    def register(self, container: Container) -> None:
        """Associa portas e classes ao container recebido, sem executar casos de uso."""

        raise NotImplementedError
