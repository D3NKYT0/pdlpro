import pytest
from rest_framework.test import APIClient
from sqlalchemy import create_engine

from apps.server.application.store_use_cases import ListGameStoresUseCase
from apps.server.domain.exceptions import CharacterServiceUnavailableError
from apps.server.domain.gateways import GameStore, GameStoreItem, ILineageGateway
from apps.server.infrastructure.lineage.catalog import LineageQueryCatalog
from apps.server.infrastructure.null_gateway import NullLineageGateway
from apps.server.infrastructure.sqlalchemy_gateway import SqlAlchemyLineageGateway
from common.di.bootstrap import DependencyInjection


@pytest.mark.django_db
def test_public_stores_list_and_filter_by_item_name():
    gateway = DependencyInjection.root().resolve(ILineageGateway)
    assert isinstance(gateway, NullLineageGateway)
    gateway.seed_store(
        char_id=11,
        name="TraderAnn",
        title="Soulshots D",
        sex=1,
        class_id=88,
        items=[GameStoreItem(item_id=1463, quantity=500, price=1200, enchant=0)],
    )
    gateway.seed_store(
        char_id=12,
        name="BowMaster",
        store_type=3,
        title="Compro bows",
        items=[GameStoreItem(item_id=2500, quantity=1, price=80_000_000, enchant=0)],
    )

    api = APIClient()
    listed = api.get("/api/v1/public/server/stores/")
    assert listed.status_code == 200
    assert listed.data["available"] is True
    assert len(listed.data["stores"]) == 2
    first = next(row for row in listed.data["stores"] if row["name"] == "TraderAnn")
    assert first["store_type"] == "sell"
    assert first["town"] == "giran"
    assert first["sex"] == 1
    assert first["race"] == "human"
    assert first["x"] == 83400
    assert first["items"][0]["item_id"] == 1463

    filtered = api.get("/api/v1/public/server/stores/?q=traderann")
    assert len(filtered.data["stores"]) == 1
    buys = api.get("/api/v1/public/server/stores/?type=buy")
    assert len(buys.data["stores"]) == 1
    assert buys.data["stores"][0]["name"] == "BowMaster"


class _FailingStoresGateway:
    def supports(self, capability: str) -> bool:
        return capability == "GAME_STORES"

    def list_private_store_items(self):
        raise CharacterServiceUnavailableError()

    def list_private_stores(self):
        return []


class _Names:
    def display_name(self, item_id: int, fallback: str | None = None) -> str:
        return fallback or str(item_id)

    def metadata(self, item_id: int) -> dict:
        return {}


def test_list_stores_marks_unavailable_when_game_tables_are_missing():
    result = ListGameStoresUseCase(_FailingStoresGateway(), _Names()).execute()
    assert result == {"available": False, "stores": []}


def test_sql_gateway_store_lists_fail_closed_without_offline_tables():
    from django.core.cache import cache

    cache.clear()
    gateway = SqlAlchemyLineageGateway(LineageQueryCatalog.load("dreamv3"))
    gateway._engine = create_engine("sqlite://")
    with pytest.raises(CharacterServiceUnavailableError):
        gateway.list_private_store_items()
    with pytest.raises(CharacterServiceUnavailableError):
        gateway.list_private_stores()


def test_sql_gateway_reuses_cached_store_lists(monkeypatch):
    from django.core.cache import cache

    cache.clear()
    gateway = SqlAlchemyLineageGateway(LineageQueryCatalog.load("dreamv3"))
    calls = {"n": 0}

    def fake_fetch(name, params=None):
        calls["n"] += 1
        if name == "list_private_stores":
            return [
                {
                    "char_id": 1,
                    "name": "Ann",
                    "store_type": 1,
                    "title": "",
                    "x": 0,
                    "y": 0,
                    "z": 0,
                    "clan_name": "",
                    "sex": 0,
                    "class_id": 0,
                }
            ]
        return []

    monkeypatch.setattr(gateway, "_fetch", fake_fetch)
    first = gateway.list_private_stores()
    second = gateway.list_private_stores()
    assert first[0].name == "Ann"
    assert second[0].name == "Ann"
    assert calls["n"] == 1


def test_lineage_read_cache_skips_loader_on_hit():
    from django.core.cache import cache

    from apps.server.infrastructure.read_cache import cached_fetch

    cache.clear()
    calls = {"n": 0}

    def loader():
        calls["n"] += 1
        return [{"char_id": 1}]

    assert cached_fetch("lineage:test", loader, 30) == [{"char_id": 1}]
    assert cached_fetch("lineage:test", loader, 30) == [{"char_id": 1}]
    assert calls["n"] == 1


class _RecipeCatalog:
    def display_name(self, item_id: int, fallback: str | None = None) -> str:
        names = {4967: "Recipe: Sword of Valhalla (60%)", 148: "Sword of Valhalla", 57: "Adena"}
        return names.get(item_id, fallback or str(item_id))

    def metadata(self, item_id: int) -> dict:
        return {"recipe_result_id": 148 if item_id == 4967 else None}


class _CraftGateway:
    def supports(self, capability: str) -> bool:
        return capability == "GAME_STORES"

    def list_private_stores(self):
        return [GameStore(char_id=1, name="Smith", store_type=8, title="Craft A")]

    def list_private_store_items(self):
        return [
            GameStoreItem(item_id=4967, quantity=1, price=2_200_000, enchant=0, char_id=1),
            GameStoreItem(item_id=57, quantity=20, price=95_000, enchant=0, char_id=1),
        ]


def test_craft_recipe_includes_result_item_and_matches_product_search():
    result = ListGameStoresUseCase(_CraftGateway(), _RecipeCatalog()).execute({"query": "valhalla"})
    assert result["available"] is True
    assert len(result["stores"]) == 1
    recipe, adena = result["stores"][0]["items"]
    assert recipe["item_id"] == 4967
    assert recipe["result_item_id"] == 148
    assert recipe["result_name"] == "Sword of Valhalla"
    assert "result_item_id" not in adena
    empty = ListGameStoresUseCase(_CraftGateway(), _RecipeCatalog()).execute({"query": "soulshot"})
    assert empty["stores"] == []
