"""Política única de disponibilidade para ações que consomem recursos dos jogos."""

from apps.games.domain.exceptions import GameInactiveError
from apps.games.domain.repositories import IGameCatalogRepository, IGameConfigAdminRepository


def _resolve_catalog(catalog: IGameCatalogRepository | None) -> IGameCatalogRepository:
    if catalog is not None:
        return catalog
    from common.di.bootstrap import DependencyInjection

    return DependencyInjection.root().create_scope().resolve(IGameCatalogRepository)


def require_active_game(
    code: str,
    *,
    catalog: IGameCatalogRepository | None = None,
    configs: IGameConfigAdminRepository | None = None,
):
    """Retorna a configuração ativa ou recusa a ação antes de consumir recursos.

    Consultas de catálogo podem mostrar jogos inativos; use esta função nas
    operações que exigem disponibilidade, como giros e apostas.
    """
    if configs is not None:
        row = configs.get_active_by_code(code)
    else:
        row = _resolve_catalog(catalog).get_active_config(code)
    if row is None:
        raise GameInactiveError()
    return row
