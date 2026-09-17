import pytest
from rest_framework.test import APIClient
from sqlalchemy import create_engine

from apps.server.application.store_use_cases import ListGameStoresUseCase
from apps.server.domain.exceptions import CharacterServiceUnavailableError
from apps.server.domain.gateways import GameStoreItem, ILineageGateway
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


def test_list_stores_marks_unavailable_when_game_tables_are_missing():
    result = ListGameStoresUseCase(_FailingStoresGateway(), _Names()).execute()
    assert result == {"available": False, "stores": []}


def test_sql_gateway_store_lists_fail_closed_without_offline_tables():
    gateway = SqlAlchemyLineageGateway(LineageQueryCatalog.load("dreamv3"))
    gateway._engine = create_engine("sqlite://")
    with pytest.raises(CharacterServiceUnavailableError):
        gateway.list_private_store_items()
    with pytest.raises(CharacterServiceUnavailableError):
        gateway.list_private_stores()
