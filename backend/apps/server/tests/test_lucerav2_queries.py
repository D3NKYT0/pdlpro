"""Regression contract for the inspected lucerav2 schema; no live DB writes.

SQLite checks SELECT column references and representative results in memory.
MySQL-specific UPDATE/DELETE ordering and trade lists logic are checked below.
"""

from __future__ import annotations

import re
import sqlite3
from unittest.mock import MagicMock

import pytest

from apps.server.application.store_use_cases import ListGameStoresUseCase
from apps.server.application.use_cases import PUBLIC_LINEAGE_QUERIES
from apps.server.domain.exceptions import CharacterServiceUnavailableError
from apps.server.infrastructure.lineage.catalog import LineageQueryCatalog
from apps.server.infrastructure.sqlalchemy_gateway import SqlAlchemyLineageGateway

CATALOG = LineageQueryCatalog.load("lucerav2")
READ_QUERIES = [
    name for name, sql in CATALOG._statements.items()
    if re.sub(r"(?m)^\s*--.*$", "", sql).strip().upper().startswith("SELECT")
    and name not in ("exchange_table_engines", "list_character_equipment_fallback")
]


@pytest.fixture
def schema():
    connection = sqlite3.connect(":memory:")
    connection.create_function("CONCAT", -1, lambda *args: "".join(map(str, args)))
    connection.row_factory = sqlite3.Row
    connection.executescript("""
        CREATE TABLE accounts (
            login TEXT PRIMARY KEY, password TEXT NOT NULL, accessLevel INTEGER,
            email TEXT NOT NULL DEFAULT '', created_time INTEGER, linked_uuid TEXT
        );
        CREATE TABLE pdl_exchange_receipts (receipt TEXT PRIMARY KEY, completed INTEGER, error TEXT);
        CREATE TABLE characters (
            obj_Id INTEGER PRIMARY KEY, account_name TEXT, char_name TEXT,
            online INTEGER, sex INTEGER, pvpkills INTEGER, pkkills INTEGER,
            title TEXT, clanid INTEGER, accesslevel INTEGER, onlinetime INTEGER,
            karma INTEGER, lastAccess INTEGER, x INTEGER, y INTEGER, z INTEGER,
            hairStyle INTEGER, hairColor INTEGER, face INTEGER
        );
        CREATE TABLE character_subclasses (
            char_obj_id INTEGER, level INTEGER, class_id INTEGER, isBase INTEGER
        );
        CREATE TABLE clan_data (
            clan_id INTEGER PRIMARY KEY, clan_level INTEGER,
            reputation_score INTEGER, ally_id INTEGER, hasCastle INTEGER, crest BLOB
        );
        CREATE TABLE clan_subpledges (
            clan_id INTEGER, type INTEGER, name TEXT, leader_id INTEGER
        );
        CREATE TABLE ally_data (ally_id INTEGER, ally_name TEXT, crest BLOB);
        CREATE TABLE items (
            item_id INTEGER PRIMARY KEY, owner_id INTEGER, item_type INTEGER,
            amount INTEGER, location TEXT, enchant INTEGER, slot INTEGER
        );
        CREATE TABLE character_skills (
            char_obj_id INTEGER, skill_id INTEGER, skill_level INTEGER, class_index INTEGER
        );
        CREATE TABLE items_delayed (
            payment_id INTEGER PRIMARY KEY, owner_id INTEGER NOT NULL,
            item_id INTEGER NOT NULL, count INTEGER NOT NULL DEFAULT 1,
            enchant_level INTEGER NOT NULL DEFAULT 0,
            variationId1 INTEGER NOT NULL DEFAULT 0, variationId2 INTEGER NOT NULL DEFAULT 0,
            flags INTEGER NOT NULL DEFAULT 0, payment_status INTEGER NOT NULL DEFAULT 0,
            description TEXT
        );
        CREATE TABLE oly_nobles (char_id INTEGER, points_current INTEGER);
        CREATE TABLE oly_heroes (char_id INTEGER, count INTEGER, played INTEGER);
        CREATE TABLE epic_boss_spawn (bossId INTEGER, respawnDate INTEGER);
        CREATE TABLE castle (
            id INTEGER, name TEXT, siege_date INTEGER, treasury INTEGER, tax_percent INTEGER
        );
        CREATE TABLE siege_clans (type TEXT, clan_id INTEGER, residence_id INTEGER);
        CREATE TABLE character_variables (
            obj_id INTEGER, type TEXT, name TEXT, value TEXT
        );
        CREATE TABLE character_trade_lists (
            char_id INTEGER, store_type INTEGER, slot INTEGER,
            item_obj_id INTEGER, item_id INTEGER, count INTEGER, price INTEGER, enchant INTEGER
        );
        CREATE TABLE character_offline_trade (
            charId INTEGER, time INTEGER, type INTEGER, title TEXT
        );
        CREATE TABLE character_offline_trade_items (
            charId INTEGER, item INTEGER, count INTEGER, price INTEGER, enchant INTEGER
        );

        INSERT INTO characters VALUES
            (101, 'player', 'Knight', 0, 0, 10, 2, 'Title', 7, 0, 3600, 150, 1700000000000, 100, 200, -300, 1, 2, 0),
            (102, 'buyer', 'BuyerChar', 0, 1, 5, 0, 'Buyer', NULL, 0, 1800, 0, 1700000000000, 400, 500, -600, 0, 1, 0),
            (103, 'crafter', 'DwarfCraft', 0, 1, 0, 0, 'Crafter', NULL, 0, 2400, 0, 1700000000000, 700, 800, -900, 0, 0, 0),
            (104, 'online_player', 'OnlineGuy', 1, 0, 20, 1, 'Online', NULL, 0, 5000, 0, 1700000000000, 0, 0, 0, 1, 1, 0),
            (105, 'disconnected', 'JustOffline', 0, 0, 0, 0, 'None', NULL, 0, 600, 0, 1700000000000, 0, 0, 0, 0, 0, 0);

        INSERT INTO character_subclasses VALUES
            (101, 80, 88, 1),
            (102, 75, 4, 1),
            (103, 70, 56, 1);

        INSERT INTO clan_data VALUES (7, 5, 200, 3, 1, NULL);
        INSERT INTO clan_subpledges VALUES (7, 0, 'Guild', 101);
        INSERT INTO ally_data VALUES (3, 'Alliance', NULL);

        -- Player 101: offline sell store
        INSERT INTO character_variables VALUES
            (101, 'user-var', 'offline', '1'),
            (101, 'user-var', 'storemode', '1'),
            (101, 'user-var', 'sellstorename', 'Venda de Shots');
        INSERT INTO character_trade_lists VALUES
            (101, 1, 0, 9001, 57, 1000, 1, 0),
            (101, 1, 1, 9002, 1835, 50, 500, 3),
            -- inactive buy list from previous session
            (101, 3, 0, 9003, 100, 1, 10, 0);

        -- Player 102: offline buy store
        INSERT INTO character_variables VALUES
            (102, 'user-var', 'offline', '1'),
            (102, 'user-var', 'storemode', '3'),
            (102, 'user-var', 'buystorename', 'Compro Materiais');
        INSERT INTO character_trade_lists VALUES
            (102, 3, 0, 9004, 1864, 200, 2000, 0);

        -- Player 103: offline craft/manufacture store
        INSERT INTO character_variables VALUES
            (103, 'user-var', 'offline', '1'),
            (103, 'user-var', 'storemode', '4'),
            (103, 'user-var', 'manufacturename', 'Craft BspD');
        INSERT INTO character_trade_lists VALUES
            (103, 4, 0, 9005, 500, 1, 5000, 0);

        -- Player 104: online with trade variables (should not appear)
        INSERT INTO character_variables VALUES
            (104, 'user-var', 'offline', '1'),
            (104, 'user-var', 'storemode', '1');
        INSERT INTO character_trade_lists VALUES
            (104, 1, 0, 9006, 57, 1, 1, 0);

        INSERT INTO items VALUES
            (1001, 101, 57, 100, 'INVENTORY', 0, -1),
            (1002, 101, 57, 250, 'WAREHOUSE', 0, -1),
            (1003, 101, 100, 1, 'PAPERDOLL', 7, 10),
            (1004, 101, 200, 1, 'MAIL', 0, -1);
        INSERT INTO character_skills VALUES (101, 1, 37, 0), (101, 3, 9, 0);
    """)
    yield connection
    connection.close()


def test_complete_feature_catalog():
    assert set(CATALOG.REQUIRED) <= CATALOG._statements.keys()
    assert PUBLIC_LINEAGE_QUERIES <= CATALOG._statements.keys()
    assert CATALOG.has("list_character_equipment")
    assert CATALOG.has("list_character_equipment_fallback")
    assert CATALOG.has("list_character_skills")
    assert CATALOG.has("list_private_stores")
    assert CATALOG.has("list_private_store_items")
    assert CATALOG.has("list_private_stores_fallback")
    assert CATALOG.has("list_private_store_items_fallback")
    assert CATALOG.has("change_appearance")


@pytest.mark.parametrize("name", READ_QUERIES)
def test_selects_resolve_against_schema(schema, name):
    sql = re.sub(r"\s+FOR UPDATE\s*$", "", CATALOG[name], flags=re.IGNORECASE)
    params = {key: 1 for key in re.findall(r":([a-zA-Z_][a-zA-Z0-9_]*)", sql)}
    schema.execute("EXPLAIN QUERY PLAN " + sql, params).fetchall()


def test_character_equipment_query_resolves_paperdoll(schema):
    rows = schema.execute(CATALOG["list_character_equipment"], {"char_id": 101}).fetchall()
    assert len(rows) == 1
    assert dict(rows[0]) == {
        "item_id": 100,
        "quantity": 1,
        "enchant": 7,
        "slot": 10,
    }


def test_character_equipment_fallback_query_resolves_loc_data():
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.executescript("""
        CREATE TABLE items (
            item_id INTEGER PRIMARY KEY, owner_id INTEGER, item_type INTEGER,
            amount INTEGER, location TEXT, enchant INTEGER, loc_data INTEGER
        );
        INSERT INTO items VALUES (2001, 101, 100, 1, 'PAPERDOLL', 7, 10);
    """)
    rows = conn.execute(CATALOG["list_character_equipment_fallback"], {"char_id": 101}).fetchall()
    assert len(rows) == 1
    assert dict(rows[0]) == {
        "item_id": 100,
        "quantity": 1,
        "enchant": 7,
        "slot": 10,
    }


def test_private_stores_primary_schema_lucera2(schema):
    stores = [dict(r) for r in schema.execute(CATALOG["list_private_stores"]).fetchall()]
    assert len(stores) == 3

    # Sorted by char_name ASC: BuyerChar, DwarfCraft, Knight
    assert stores[0]["name"] == "BuyerChar"
    assert stores[0]["store_type"] == 3
    assert stores[0]["title"] == "Compro Materiais"
    assert stores[0]["x"] == 400

    assert stores[1]["name"] == "DwarfCraft"
    assert stores[1]["store_type"] == 4
    assert stores[1]["title"] == "Craft BspD"
    assert stores[1]["x"] == 700

    assert stores[2]["name"] == "Knight"
    assert stores[2]["store_type"] == 1
    assert stores[2]["title"] == "Venda de Shots"
    assert stores[2]["clan_name"] == "Guild"
    assert stores[2]["x"] == 100

    items = [dict(r) for r in schema.execute(CATALOG["list_private_store_items"]).fetchall()]
    # Knight has 2 items for store_type=1 (the store_type=3 item is excluded)
    knight_items = [i for i in items if i["char_id"] == 101]
    assert len(knight_items) == 2
    assert knight_items[0]["item_id"] == 57
    assert knight_items[0]["quantity"] == 1000
    assert knight_items[0]["price"] == 1
    assert knight_items[0]["enchant"] == 0
    assert knight_items[1]["item_id"] == 1835
    assert knight_items[1]["quantity"] == 50
    assert knight_items[1]["price"] == 500
    assert knight_items[1]["enchant"] == 3

    # Buyer has 1 item
    buyer_items = [i for i in items if i["char_id"] == 102]
    assert len(buyer_items) == 1
    assert buyer_items[0]["item_id"] == 1864
    assert buyer_items[0]["quantity"] == 200
    assert buyer_items[0]["price"] == 2000

    # Dwarf has 1 item
    dwarf_items = [i for i in items if i["char_id"] == 103]
    assert len(dwarf_items) == 1
    assert dwarf_items[0]["item_id"] == 500
    assert dwarf_items[0]["price"] == 5000


def test_private_stores_use_case_filters_and_mapping():
    mock_lineage = MagicMock()
    mock_lineage.supports.return_value = True

    from apps.server.domain.gateways import GameStore, GameStoreItem

    mock_lineage.list_private_stores.return_value = [
        GameStore(char_id=101, name="Seller", store_type=1, title="Sell Title", x=0, y=0, z=0, clan_name="", sex=0, class_id=88),
        GameStore(char_id=102, name="Buyer", store_type=3, title="Buy Title", x=0, y=0, z=0, clan_name="", sex=1, class_id=4),
        GameStore(char_id=103, name="Crafter", store_type=4, title="Craft Title", x=0, y=0, z=0, clan_name="", sex=1, class_id=56),
    ]
    mock_lineage.list_private_store_items.return_value = [
        GameStoreItem(char_id=101, item_id=57, quantity=1000, price=1, enchant=0),
        GameStoreItem(char_id=102, item_id=1864, quantity=100, price=2000, enchant=0),
        GameStoreItem(char_id=103, item_id=500, quantity=1, price=5000, enchant=0),
    ]

    mock_catalog = MagicMock()
    mock_catalog.display_name.side_effect = lambda i, d: f"Item {i}"
    mock_catalog.metadata.return_value = {}

    use_case = ListGameStoresUseCase(mock_lineage, mock_catalog)

    # All stores
    result = use_case.execute()
    assert result["available"] is True
    assert len(result["stores"]) == 3
    types = [s["store_type"] for s in result["stores"]]
    assert types == ["sell", "buy", "craft"]

    # Filter craft (mode 4)
    craft_result = use_case.execute({"store_type": "craft"})
    assert len(craft_result["stores"]) == 1
    assert craft_result["stores"][0]["name"] == "Crafter"
    assert craft_result["stores"][0]["store_type"] == "craft"

    # Filter buy (mode 3)
    buy_result = use_case.execute({"store_type": "buy"})
    assert len(buy_result["stores"]) == 1
    assert buy_result["stores"][0]["name"] == "Buyer"

    # Filter sell (mode 1)
    sell_result = use_case.execute({"store_type": "sell"})
    assert len(sell_result["stores"]) == 1
    assert sell_result["stores"][0]["name"] == "Seller"


def test_private_stores_fallback_schema_when_trade_lists_missing():
    from sqlalchemy import create_engine, text

    engine = create_engine("sqlite://")
    ddl = [
        "CREATE TABLE characters (obj_Id INTEGER PRIMARY KEY, char_name TEXT, online INTEGER, sex INTEGER, x INTEGER, y INTEGER, z INTEGER, clanid INTEGER)",
        "CREATE TABLE character_subclasses (char_obj_id INTEGER, level INTEGER, class_id INTEGER, isBase INTEGER)",
        "CREATE TABLE clan_subpledges (clan_id INTEGER, type INTEGER, name TEXT, leader_id INTEGER)",
        "CREATE TABLE character_offline_trade (charId INTEGER, time INTEGER, type INTEGER, title TEXT)",
        "CREATE TABLE character_offline_trade_items (charId INTEGER, item INTEGER, count INTEGER, price INTEGER, enchant INTEGER)",
        "INSERT INTO characters VALUES (201, 'LegacyTrader', 0, 0, 10, 20, 30, NULL)",
        "INSERT INTO character_subclasses VALUES (201, 75, 10, 1)",
        "INSERT INTO character_offline_trade VALUES (201, 0, 1, 'Legacy Store')",
        "INSERT INTO character_offline_trade_items VALUES (201, 57, 500, 2, 0)",
    ]
    with engine.begin() as conn:
        for stmt in ddl:
            conn.execute(text(stmt))

    gw = SqlAlchemyLineageGateway(CATALOG)
    gw._engine = engine

    # primary list_private_stores fails (no character_trade_lists table), falls back to list_private_stores_fallback
    stores = gw.list_private_stores()
    assert len(stores) == 1
    assert stores[0].name == "LegacyTrader"
    assert stores[0].title == "Legacy Store"
    assert stores[0].store_type == 1

    items = gw.list_private_store_items()
    assert len(items) == 1
    assert items[0].item_id == 57
    assert items[0].quantity == 500
    assert items[0].price == 2


def test_private_stores_unavailable_when_neither_table_exists():
    from sqlalchemy import create_engine, text

    engine = create_engine("sqlite://")
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE characters (obj_Id INTEGER PRIMARY KEY, char_name TEXT, online INTEGER, sex INTEGER, x INTEGER, y INTEGER, z INTEGER, clanid INTEGER)"))

    gw = SqlAlchemyLineageGateway(CATALOG)
    gw._engine = engine

    with pytest.raises(CharacterServiceUnavailableError):
        gw.list_private_stores()

    with pytest.raises(CharacterServiceUnavailableError):
        gw.list_private_store_items()


@pytest.mark.django_db
def test_gateway_list_character_equipment_primary_and_fallback():
    from sqlalchemy import create_engine, text

    # 1. Primary schema with items.slot
    engine_primary = create_engine("sqlite://")
    with engine_primary.begin() as conn:
        conn.execute(text("CREATE TABLE items (item_id INTEGER PRIMARY KEY, owner_id INTEGER, item_type INTEGER, amount INTEGER, location TEXT, enchant INTEGER, slot INTEGER)"))
        conn.execute(text("INSERT INTO items VALUES (101, 1, 100, 1, 'PAPERDOLL', 7, 10)"))

    gw_primary = SqlAlchemyLineageGateway(CATALOG)
    gw_primary._engine = engine_primary
    eq_primary = gw_primary.list_character_equipment(1)
    assert len(eq_primary) == 1
    assert eq_primary[0].item_id == 100
    assert eq_primary[0].quantity == 1
    assert eq_primary[0].enchant == 7
    assert eq_primary[0].slot == 10
    assert getattr(gw_primary, "_schema_variant_list_character_equipment") == "primary"

    # 2. Fallback schema with items.loc_data (no slot column)
    engine_fallback = create_engine("sqlite://")
    with engine_fallback.begin() as conn:
        conn.execute(text("CREATE TABLE items (item_id INTEGER PRIMARY KEY, owner_id INTEGER, item_type INTEGER, amount INTEGER, location TEXT, enchant INTEGER, loc_data INTEGER)"))
        conn.execute(text("INSERT INTO items VALUES (102, 1, 200, 1, 'PAPERDOLL', 5, 12)"))

    gw_fallback = SqlAlchemyLineageGateway(CATALOG)
    gw_fallback._engine = engine_fallback
    eq_fallback = gw_fallback.list_character_equipment(1)
    assert len(eq_fallback) == 1
    assert eq_fallback[0].item_id == 200
    assert eq_fallback[0].quantity == 1
    assert eq_fallback[0].enchant == 5
    assert eq_fallback[0].slot == 12
    assert getattr(gw_fallback, "_schema_variant_list_character_equipment") == "fallback"


