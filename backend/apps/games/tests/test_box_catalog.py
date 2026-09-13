from types import SimpleNamespace

from apps.games.application.box_catalog import (
    box_catalog_preview,
    pick_featured_box_item,
)


def _item(**fields):
    defaults = {"enchant": 0, "quantity": 1, "weight": 10, "rarity": "common"}
    defaults.update(fields)
    return SimpleNamespace(**defaults)


def test_featured_prefers_boss_jewel_over_adena():
    adena = _item(name="Adena", item_id=57, quantity=3_000_000, rarity="legendary", weight=1)
    ring = _item(name="Ring of Baium", item_id=6658, rarity="legendary", weight=1)
    assert pick_featured_box_item([adena, ring]) is ring


def test_featured_uses_legendary_when_the_catalog_has_one():
    potion = _item(name="Healing Potion", item_id=1539, rarity="common", weight=12)
    scroll = _item(name="Enchant Weapon C", item_id=951, rarity="epic", weight=4)
    ring = _item(name="Ring of Baium", item_id=6658, rarity="legendary", weight=1)
    assert pick_featured_box_item([potion, scroll, ring]) is ring


def test_featured_uses_rarity_then_hunt_face():
    potion = _item(name="Healing Potion", item_id=1539, rarity="common", weight=12)
    scroll = _item(name="Enchant Weapon D", item_id=955, rarity="rare", weight=7)
    gold = _item(name="Gold Bar", item_id=3470, rarity="rare", weight=6)
    assert pick_featured_box_item([potion, scroll, gold]) is gold


def test_preview_keeps_featured_out_of_the_also_list():
    ring = _item(name="Ring of Baium", item_id=6658, rarity="legendary", weight=1)
    scroll = _item(name="Blessed Enchant S", item_id=6577, rarity="legendary", weight=1)
    featured, others = box_catalog_preview([ring, scroll])
    assert featured["item_id"] == 6658
    assert [item["item_id"] for item in others] == [6577]


def test_empty_catalog_has_no_face():
    featured, others = box_catalog_preview([])
    assert featured is None
    assert others == []
