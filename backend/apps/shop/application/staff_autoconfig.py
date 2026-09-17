from __future__ import annotations

from apps.shop.domain.autoconfig import IShopAutoconfigService
from common.architecture.base import UnitOfWork, UseCase


class BootstrapStaffShopUseCase(UseCase[None, dict]):
    """Preenche o catálogo padrão da loja (itens avulsos e pacotes low grade).

    Uso: resolva pelo container e chame ``execute(None)``. O retorno é ``dict``. A operação
    é idempotente: uma segunda chamada não duplica SKUs ``(item_id, quantity)`` nem pacotes
    com o mesmo nome canônico, e não altera preço ou composição já definidos pela equipe.
    """

    def __init__(self, autoconfig: IShopAutoconfigService, unit_of_work: UnitOfWork) -> None:
        self._autoconfig = autoconfig
        self._unit_of_work = unit_of_work

    def execute(self, data: None = None) -> dict:
        with self._unit_of_work:
            return self._autoconfig.bootstrap()
