from apps.games.infrastructure.models import Bag, BagItem


def add_to_bag(user, *, item_id: int, item_name: str, enchant: int = 0, quantity: int = 1) -> BagItem:
    bag, _ = Bag.objects.get_or_create(user=user)
    item, created = BagItem.objects.get_or_create(
        bag=bag,
        item_id=item_id,
        enchant=enchant,
        defaults={"item_name": item_name, "quantity": quantity},
    )
    if not created:
        item.quantity += quantity
        item.save(update_fields=["quantity", "updated_at"])
    return item
