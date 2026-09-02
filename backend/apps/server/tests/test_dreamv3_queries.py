"""Regression contract for the inspected l2jdreamv3 schema; no live DB writes.

SQLite checks SELECT column references and representative results in memory.
MySQL-specific UPDATE/DELETE ordering is checked separately below.
"""

import re
import sqlite3

import pytest

from apps.server.application.use_cases import PUBLIC_LINEAGE_QUERIES
from apps.server.infrastructure.lineage.catalog import LineageQueryCatalog


CATALOG = LineageQueryCatalog.load("dreamv3")
READ_QUERIES = [
    name for name, sql in CATALOG._statements.items()
    if re.sub(r"(?m)^\s*--.*$", "", sql).strip().upper().startswith("SELECT") and name != "exchange_table_engines"
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
            x INTEGER, y INTEGER, z INTEGER
        );
        CREATE TABLE character_subclasses (
            char_obj_id INTEGER, level INTEGER, class_id INTEGER, isBase INTEGER
        );
        CREATE TABLE clan_data (
            clan_id INTEGER PRIMARY KEY, clan_level INTEGER,
            reputation_score INTEGER, ally_id INTEGER, hasCastle INTEGER
        );
        CREATE TABLE clan_subpledges (
            clan_id INTEGER, type INTEGER, name TEXT, leader_id INTEGER
        );
        CREATE TABLE ally_data (ally_id INTEGER, ally_name TEXT);
        CREATE TABLE items (
            item_id INTEGER PRIMARY KEY, owner_id INTEGER, item_type INTEGER,
            amount INTEGER, location TEXT, enchant INTEGER, slot INTEGER
        );
        CREATE TABLE items_delayed (
            payment_id INTEGER PRIMARY KEY AUTOINCREMENT, owner_id INTEGER NOT NULL,
            item_id INTEGER NOT NULL, count INTEGER NOT NULL DEFAULT 1,
            enchant_level INTEGER NOT NULL DEFAULT 0,
            variationId1 INTEGER NOT NULL DEFAULT 0, variationId2 INTEGER NOT NULL DEFAULT 0,
            attribute INTEGER NOT NULL DEFAULT -1, attribute_level INTEGER NOT NULL DEFAULT -1,
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

        INSERT INTO characters VALUES
            (101, 'player', 'Knight', 0, 0, 10, 2, 'Title', 7, 0, 3600, 0, 0, 0);
        INSERT INTO character_subclasses VALUES (101, 80, 88, 1), (101, 40, 1, 0);
        INSERT INTO clan_data VALUES (7, 5, 200, 0, 1);
        INSERT INTO clan_subpledges VALUES (7, 0, 'Guild', 101);
        INSERT INTO items VALUES
            (1001, 101, 57, 100, 'INVENTORY', 0, -1),
            (1002, 101, 57, 250, 'WAREHOUSE', 0, -1),
            (1003, 101, 100, 1, 'PAPERDOLL', 7, 10),
            (1004, 101, 200, 1, 'MAIL', 0, -1);
    """)
    yield connection
    connection.close()


def test_complete_feature_catalog():
    assert set(CATALOG.REQUIRED) <= CATALOG._statements.keys()
    assert PUBLIC_LINEAGE_QUERIES <= CATALOG._statements.keys()
    assert CATALOG.has("list_character_equipment")
    assert len(CATALOG._statements) == 52


@pytest.mark.parametrize("name", READ_QUERIES)
def test_selects_resolve_against_schema(schema, name):
    # SQLite checks names/columns; locking syntax is verified on the MySQL contract.
    sql = re.sub(r"\s+FOR UPDATE\s*$", "", CATALOG[name], flags=re.I)
    params = {key: 1 for key in re.findall(r":([a-zA-Z_][a-zA-Z0-9_]*)", sql)}
    schema.execute("EXPLAIN QUERY PLAN " + sql, params).fetchall()


def test_character_uses_base_class_and_main_clan(schema):
    rows = schema.execute(CATALOG["list_characters"], {"login": "player"}).fetchall()
    assert len(rows) == 1
    assert dict(rows[0]) == {
        "char_id": 101, "name": "Knight", "level": 80, "online": 0, "sex": 0,
        "pvp": 10, "pk": 2, "class_id": 88, "title": "Title",
        "clan_name": "Guild", "is_clan_leader": 1,
    }


def test_adena_sums_template_amounts_across_stacks(schema):
    rows = schema.execute(CATALOG["top_adena"], {"limit": 10}).fetchall()
    assert len(rows) == 1
    assert rows[0]["value"] == 350


def test_inventory_and_equipment_use_distinct_locations(schema):
    inventory = schema.execute(CATALOG["list_character_items"], {"char_id": 101}).fetchall()
    assert [row["quantity"] for row in inventory] == [100, 250]
    equipment = schema.execute(CATALOG["list_character_equipment"], {"char_id": 101}).fetchall()
    assert [dict(row) for row in equipment] == [
        {"item_id": 100, "quantity": 1, "enchant": 7, "slot": 10}
    ]


@pytest.mark.parametrize("name", ["delete_item_stack", "update_item_amount"])
def test_withdrawal_uses_same_locations_and_stack_order(name):
    sql = CATALOG[name]
    assert "owner_id = :char_id" in sql
    assert "item_type = :item_id" in sql
    assert "enchant = :enchant" in sql
    assert "location IN ('INVENTORY', 'WAREHOUSE')" in sql
    assert "ORDER BY item_id\nLIMIT 1" in sql


def test_delayed_delivery_uses_auto_id_and_numeric_owner(schema):
    params = {"owner_id": 101, "item_id": 57, "qty": 1000, "enchant": 0}
    schema.execute(CATALOG["deposit_item"], params)
    schema.execute(CATALOG["deposit_item"], params)
    rows = schema.execute("SELECT * FROM items_delayed ORDER BY payment_id").fetchall()
    assert [row["payment_id"] for row in rows] == [1, 2]
    assert rows[0]["owner_id"] == 101
    assert rows[0]["count"] == 1000
    assert rows[0]["enchant_level"] == 0
    assert rows[0]["attribute"] == -1
    assert rows[0]["attribute_level"] == -1
    assert rows[0]["payment_status"] == 0


def test_register_records_creation_time(schema):
    schema.execute(CATALOG["register_account"], {
        "login": "test", "password": "test-hash", "email": "test@example.invalid",
        "created_time": 1700000000,
    })
    row = schema.execute("SELECT accessLevel, created_time FROM accounts WHERE login='test'").fetchone()
    assert tuple(row) == (0, 1700000000)


def test_observation_includes_clan_warehouse_without_a_character_owner(schema):
    schema.execute("INSERT INTO items VALUES (2000, 7, 57, 50, 'CLANWH', 0, -1)")
    rows = schema.execute(CATALOG["monitor_items"], {"row_limit": 100}).fetchall()
    adena = next(row for row in rows if row["item_id"] == 57)
    assert adena["quantity"] == 400
    assert adena["unique_owners"] == 2  # One character plus a clan.
    assert all(row["item_id"] != 200 for row in rows)  # MAIL is outside the scope.
