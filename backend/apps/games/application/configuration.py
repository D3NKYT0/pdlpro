"""Política única de disponibilidade para ações que consomem recursos dos jogos."""

from apps.games.domain.exceptions import GameInactiveError
from apps.games.domain.repositories import (
    IGameCatalogRepository,
    IGameConfigAdminRepository,
)


def require_active_game(
    code: str,
    *,
    catalog: IGameCatalogRepository | None = None,
    configs: IGameConfigAdminRepository | None = None,
):
    """Retorna a configuração ativa ou recusa a ação antes de consumir recursos.

    Consulte via ``catalog`` ou ``configs``; pelo menos um deve ser informado.
    Consultas de catálogo podem mostrar jogos inativos; use esta função nas
    operações que exigem disponibilidade, como giros e apostas.
    """
    if configs is not None:
        row = configs.get_active_by_code(code)
    elif catalog is not None:
        row = catalog.get_active_config(code)
    else:
        raise TypeError("Informe catalog ou configs.")
    if row is None:
        raise GameInactiveError()
    return row
