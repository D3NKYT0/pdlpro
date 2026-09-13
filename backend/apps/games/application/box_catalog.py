"""Seleção do item em mira e vitrine do catálogo de um baú.

O domínio permanece sem Django: os itens só precisam expor ``item_id``, ``name``,
``enchant``, ``quantity``, ``rarity`` e ``weight``.
"""

from __future__ import annotations

from typing import Any

# Joia de boss e encantamentos de grau alto aparecem na face do baú quando empatam.
_HUNT_FACE_IDS = (6658, 6577, 6578, 6569, 947, 8748, 951, 955, 3470)
_HUNT_FACE_RANK = {item_id: index for index, item_id in enumerate(_HUNT_FACE_IDS)}
_RARITY_RANK = {
    "legendary": 0,
    "lendario": 0,
    "legendario": 0,
    "epic": 1,
    "epico": 1,
    "rare": 2,
    "raro": 2,
    "uncommon": 3,
    "incomum": 3,
    "common": 4,
    "comum": 4,
}


def _rarity_rank(value: str) -> int:
    key = value.casefold().replace("é", "e").replace("á", "a")
    return _RARITY_RANK.get(key, 9)


def is_legendary_box_item(item: Any) -> bool:
    """Lendário de verdade: raridade lendária, sem usar Adena como item em mira."""
    return item.item_id != 57 and _rarity_rank(getattr(item, "rarity", "") or "") == 0


def serialize_box_item(item: Any) -> dict:
    """Serializa um item de catálogo para a vitrine do jogador."""
    return {
        "name": item.name,
        "item_id": item.item_id,
        "enchant": getattr(item, "enchant", 0) or 0,
        "quantity": max(1, getattr(item, "quantity", 1) or 1),
        "rarity": item.rarity,
    }


def pick_featured_box_item(items: list[Any]) -> Any | None:
    """Escolhe o item em mira: lendário quando existir, sem preferir Adena."""
    if not items:
        return None
    pool = [item for item in items if is_legendary_box_item(item)] or items
    return min(
        pool,
        key=lambda item: (
            item.item_id == 57,
            _rarity_rank(getattr(item, "rarity", "") or ""),
            getattr(item, "weight", 99),
            _HUNT_FACE_RANK.get(item.item_id, 99),
            getattr(item, "name", ""),
        ),
    )


def box_catalog_preview(items: list[Any], limit: int = 8) -> tuple[dict | None, list[dict]]:
    """Devolve o item em mira e os demais da vitrine, sem repetir a face."""
    featured = pick_featured_box_item(items)
    featured_payload = serialize_box_item(featured) if featured is not None else None
    others: list[dict] = []
    featured_id = getattr(featured, "item_id", None)
    featured_qty = getattr(featured, "quantity", 1) if featured is not None else None
    for item in items:
        if item.item_id == featured_id and getattr(item, "quantity", 1) == featured_qty:
            continue
        others.append(serialize_box_item(item))
        if len(others) >= limit:
            break
    return featured_payload, others
