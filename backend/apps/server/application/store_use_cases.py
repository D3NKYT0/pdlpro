"""Leitura pública das lojas offline do jogo."""

from __future__ import annotations

from apps.server.domain.exceptions import CharacterServiceUnavailableError
from apps.server.domain.gateways import GameStore, ILineageGateway
from apps.server.domain.item_catalog import IItemDisplayName
from apps.server.domain.towns import nearest_town_code
from common.architecture.base import UseCase

STORE_TYPES = {1: "sell", 3: "buy", 5: "package", 8: "craft", 10: "sell"}


class ListGameStoresUseCase(UseCase[dict | None, dict]):
    """Lista lojas offline, com busca por item e tipo. Sem escrita no jogo."""

    def __init__(self, lineage: ILineageGateway, names: IItemDisplayName) -> None:
        self._lineage = lineage
        self._names = names

    def execute(self, data: dict | None = None) -> dict:
        available = self._lineage.supports("GAME_STORES")
        if not available:
            return {"available": False, "stores": []}
        query = str((data or {}).get("query") or "").strip().lower()
        store_type = str((data or {}).get("store_type") or "").strip().lower()
        items_by_char: dict[int, list] = {}
        try:
            listed_items = self._lineage.list_private_store_items()
            listed_stores = self._lineage.list_private_stores()
        except CharacterServiceUnavailableError:
            return {"available": False, "stores": []}
        for item in listed_items:
            items_by_char.setdefault(item.char_id, []).append(item)
        stores = []
        for store in listed_stores:
            kind = STORE_TYPES.get(store.store_type, "sell")
            if store_type and kind != store_type:
                continue
            listed = [
                {
                    "item_id": item.item_id,
                    "name": self._names.display_name(item.item_id, f"Item {item.item_id}"),
                    "quantity": item.quantity,
                    "price": item.price,
                    "enchant": item.enchant,
                }
                for item in items_by_char.get(store.char_id, [])
            ]
            if query and not _store_matches(store, listed, query):
                continue
            stores.append(
                {
                    "char_id": store.char_id,
                    "name": store.name,
                    "store_type": kind,
                    "title": store.title,
                    "clan_name": store.clan_name,
                    "town": nearest_town_code(store.x, store.y),
                    "x": store.x,
                    "y": store.y,
                    "z": store.z,
                    "items": listed,
                }
            )
        return {"available": True, "stores": stores}


def _store_matches(store: GameStore, items: list[dict], query: str) -> bool:
    if query in store.name.lower() or query in (store.title or "").lower():
        return True
    return any(query in str(item.get("name") or "").lower() for item in items)
