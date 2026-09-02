"""Política única de disponibilidade para ações que consomem recursos dos jogos."""

from apps.games.domain.exceptions import GameInactiveError
from apps.games.infrastructure.models import GameConfig


def require_active_game(code: str) -> GameConfig:
    """Retorna a configuração ativa ou recusa a ação antes de consumir recursos.

    Consultas de catálogo podem mostrar jogos inativos; use esta função nas
    operações que exigem disponibilidade, como giros e apostas.
    """
    row = GameConfig.objects.filter(code=code, active=True).first()
    if row is None:
        raise GameInactiveError()
    return row
