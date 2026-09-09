from __future__ import annotations

from abc import ABC, abstractmethod


class IRewardBagPort(ABC):
    """Porta fina para entregar itens de recompensa na bag do jogador.

    Isola ``ClaimRewardUseCase`` do módulo games. O adaptador Django delega a
    ``apps.games.application.bag.add_to_bag``.
    """

    @abstractmethod
    def add_item(
        self,
        user,
        *,
        item_id: int,
        item_name: str,
        enchant: int = 0,
        quantity: int = 1,
    ) -> None:
        """Acrescenta (ou acumula) o item na bag do usuário."""

        raise NotImplementedError
