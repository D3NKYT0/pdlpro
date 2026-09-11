from __future__ import annotations

from abc import ABC, abstractmethod

KNOWN_GAME_CODES = (
    "roulette",
    "daily_bonus",
    "dice",
    "slots",
    "fishing",
    "economy",
    "boxes",
)


class IGameAutoconfigService(ABC):
    """Porta de preenchimento idempotente do conteúdo jogável dos minigames.

    Injete no caso de uso staff e registre o adaptador no GamesProvider. ``code`` None aplica
    todos os códigos conhecidos; um código específico limita o escopo. Não sobrescreve nomes
    customizados nem chaves de ``settings`` já definidas.
    """

    @abstractmethod
    def bootstrap(self, code: str | None) -> dict:
        """Cria configuração e conteúdo padrão ausentes e devolve o resumo por jogo.

        Retorno: ``{"games": [{"code", "name", "activated", "created": {...}}]}``.
        """

        raise NotImplementedError
