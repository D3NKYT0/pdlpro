from abc import ABC, abstractmethod


class IBossCatalog(ABC):
    """Metadados de publicação dos NPCs; não modifica o servidor de jogo."""

    @abstractmethod
    def list_all(self) -> list[dict]:
        """Retorna inclusive desativados para impedir sua publicação automática."""


class INpcCatalog(ABC):
    """Identifica NPCs pelo acervo local; não consulta ou altera spawns."""

    @abstractmethod
    def get(self, npc_id: int) -> dict | None:
        """Devolve nome e nível ou None quando o NPC não está no acervo."""
