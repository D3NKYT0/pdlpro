"""Exercise receipt replay, rejection persistence and stack changes in transactions.

SQLite validates the transaction algorithm; dialect SELECTs are also checked by
test_dreamv3_queries. Deployment still requires a real offline-character smoke test.
"""

import re

import pytest
from sqlalchemy import create_engine, text

from apps.server.infrastructure.lineage.catalog import LineageQueryCatalog
from apps.server.infrastructure.sqlalchemy_gateway import SqlAlchemyLineageGateway
from common.architecture.exceptions import ValidationDomainError


@pytest.fixture
def gateway():
    queries = LineageQueryCatalog.load("dreamv3")
    queries._statements = dict(queries._statements)
    for name in ("exchange_get_receipt", "exchange_character", "exchange_stacks"):
        queries._statements[name] = re.sub(
            r"\s+FOR UPDATE\s*$", "", queries[name], flags=re.I
        )
    queries._statements["exchange_insert_receipt"] = (
        "INSERT INTO pdl_exchange_receipts(receipt,completed) VALUES(:receipt,0) ON CONFLICT(receipt) DO NOTHING"
    )
    engine = create_engine("sqlite://")
    with engine.begin() as conn:
        for sql in (
            "CREATE TABLE pdl_exchange_receipts(receipt TEXT PRIMARY KEY, completed INTEGER, error TEXT DEFAULT '')",
            "CREATE TABLE characters(obj_Id INTEGER PRIMARY KEY, char_name TEXT, account_name TEXT, online INTEGER)",
            "CREATE TABLE items(item_id INTEGER PRIMARY KEY, owner_id INTEGER, item_type INTEGER, amount INTEGER, enchant INTEGER, location TEXT)",
            "CREATE TABLE items_delayed(payment_id INTEGER PRIMARY KEY, owner_id INTEGER, item_id INTEGER, count INTEGER, enchant_level INTEGER, variationId1 INTEGER, variationId2 INTEGER, attribute INTEGER, attribute_level INTEGER, flags INTEGER, payment_status INTEGER, description TEXT)",
            "INSERT INTO characters VALUES(1,'Hero','player',0)",
            "INSERT INTO items VALUES(1,1,57,5,0,'INVENTORY'),(2,1,57,20,0,'WAREHOUSE')",
        ):
            conn.execute(text(sql))
    result = SqlAlchemyLineageGateway(queries)
    result._engine = engine
    result.assert_exchange_ready = lambda: None
    yield result
    engine.dispose()


def test_deposit_receipt_replays_once(gateway):
    for _ in range(3):
        gateway.exchange_coins("deposit", "player", 1, 57, 10, "to_game")
    with gateway._engine.connect() as conn:
        assert conn.execute(text("SELECT SUM(count) FROM items_delayed")).scalar() == 10
        assert (
            conn.execute(text("SELECT completed FROM pdl_exchange_receipts")).scalar()
            == 1
        )


def test_withdraw_consumes_stacks_once(gateway):
    for _ in range(3):
        gateway.exchange_coins("withdraw", "player", 1, 57, 10, "from_game")
    with gateway._engine.connect() as conn:
        assert conn.execute(text("SELECT item_id,amount FROM items")).all() == [(2, 15)]


@pytest.mark.parametrize("cause", ["balance", "online", "ownership"])
def test_rejection_remains_terminal_even_after_condition_changes(gateway, cause):
    quantity = 30 if cause == "balance" else 10
    login = "other" if cause == "ownership" else "player"
    if cause == "online":
        with gateway._engine.begin() as conn:
            conn.execute(text("UPDATE characters SET online=1"))
    with pytest.raises(ValidationDomainError):
        gateway.exchange_coins("rejected", login, 1, 57, quantity, "from_game")
    with gateway._engine.begin() as conn:
        assert conn.execute(text("SELECT SUM(amount) FROM items")).scalar() == 25
        assert (
            conn.execute(text("SELECT completed FROM pdl_exchange_receipts")).scalar()
            == -1
        )
        conn.execute(text("UPDATE characters SET online=0"))
        conn.execute(text("UPDATE items SET amount=100"))
    with pytest.raises(ValidationDomainError):
        gateway.exchange_coins("rejected", "player", 1, 57, quantity, "from_game")
    with gateway._engine.connect() as conn:
        assert conn.execute(text("SELECT SUM(amount) FROM items")).scalar() == 200


def test_readiness_rejects_nontransactional_or_missing_tables():
    gateway = SqlAlchemyLineageGateway(LineageQueryCatalog.load("dreamv3"))
    gateway._fetch = lambda *_: [{"table_name": "items", "engine": "MyISAM"}]
    with pytest.raises(RuntimeError):
        gateway.assert_exchange_ready()
