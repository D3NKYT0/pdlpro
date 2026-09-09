from __future__ import annotations

from apps.accounts.domain.bag import IRewardBagPort
from apps.games.application.bag import add_to_bag


class GamesRewardBagAdapter(IRewardBagPort):
    """Entrega recompensas de progresso na bag via o adaptador de games."""

    def add_item(
        self,
        user,
        *,
        item_id: int,
        item_name: str,
        enchant: int = 0,
        quantity: int = 1,
    ) -> None:
        add_to_bag(
            user,
            item_id=item_id,
            item_name=item_name,
            enchant=enchant,
            quantity=quantity,
        )
