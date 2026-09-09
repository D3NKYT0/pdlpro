from apps.games.domain.repositories import IBagRepository


def _resolve_bag(bag: IBagRepository | None) -> IBagRepository:
    if bag is not None:
        return bag
    from common.di.bootstrap import DependencyInjection

    return DependencyInjection.root().create_scope().resolve(IBagRepository)


def add_to_bag(
    user,
    *,
    item_id: int,
    item_name: str,
    enchant: int = 0,
    quantity: int = 1,
    bags: IBagRepository | None = None,
):
    """Adiciona ou incrementa um item na bag; resolve ``IBagRepository`` se omitido."""

    return _resolve_bag(bags).add_item(
        user,
        item_id=item_id,
        item_name=item_name,
        enchant=enchant,
        quantity=quantity,
    )
