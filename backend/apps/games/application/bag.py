from apps.games.domain.repositories import IBagRepository


def add_to_bag(
    user,
    *,
    item_id: int,
    item_name: str,
    enchant: int = 0,
    quantity: int = 1,
    bags: IBagRepository,
):
    """Adiciona ou incrementa um item na bag via ``IBagRepository`` injetado."""

    return bags.add_item(
        user,
        item_id=item_id,
        item_name=item_name,
        enchant=enchant,
        quantity=quantity,
    )
