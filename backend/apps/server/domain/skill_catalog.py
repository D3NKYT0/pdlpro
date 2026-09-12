from __future__ import annotations

from abc import ABC, abstractmethod


class ISkillCatalog(ABC):
    """Porta do catálogo de skills XML usada pela ficha do personagem."""

    @abstractmethod
    def display_name(self, skill_id: int, fallback: str | None = None) -> str:
        raise NotImplementedError

    @abstractmethod
    def metadata(self, skill_id: int) -> dict:
        """Metadados públicos da skill (nome, ícone, pasta da janela L2 e presença no XML)."""

        raise NotImplementedError

    @abstractmethod
    def default_icon_url(self) -> str:
        raise NotImplementedError
