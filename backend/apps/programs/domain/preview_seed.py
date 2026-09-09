from __future__ import annotations

from abc import ABC, abstractmethod


class IPreviewSeedService(ABC):
    """Porta de seed do ambiente preview (dados fictícios isolados)."""

    @abstractmethod
    def seed(self, password: str) -> None:
        """Cria ou atualiza o usuário ``preview`` e o catálogo de demonstração."""

        raise NotImplementedError
