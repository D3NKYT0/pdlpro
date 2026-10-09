"""Verifica gravações atômicas do personagem, XP/SP e kit nos três catálogos."""

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError

from apps.server.domain.character_creation import CharacterStart, InitialItem
from apps.server.domain.exceptions import (
    CharacterServiceUnavailableError,
    NicknameTakenError,
)
from apps.server.infrastructure.lineage.catalog import LineageQueryCatalog
from apps.server.infrastructure.sqlalchemy_gateway import SqlAlchemyLineageGateway


@pytest.fixture(params=["lucerav2", "dreamv3", "mobius"])
def gateway(request):
    catalog = LineageQueryCatalog.load(request.param)
    # SQLite replaces only MySQL locking, table-engine metadata and clock functions.
    catalog._statements["creation_lock"] = "SELECT 1"
    catalog._statements["creation_unlock"] = "SELECT 1"
    catalog._statements["creation_storage"] = (
        "SELECT 'characters' AS table_name, 'InnoDB' AS engine UNION ALL SELECT 'character_subclasses', 'InnoDB' UNION ALL SELECT 'items', 'InnoDB'"
    )
    catalog._statements["insert_character"] = catalog["insert_character"].replace(
        "UNIX_TIMESTAMP()", "12345"
    )
    engine = create_engine("sqlite://")
    with engine.begin() as conn:
        conn.execute(
            text(
                "CREATE TABLE characters(obj_Id INTEGER PRIMARY KEY, account_name TEXT, char_name TEXT UNIQUE, face INTEGER, hairStyle INTEGER, hairColor INTEGER, sex INTEGER, x INTEGER, y INTEGER, z INTEGER, title TEXT, createtime INTEGER)"
            )
        )
        conn.execute(
            text(
                "CREATE TABLE character_subclasses(char_obj_id INTEGER PRIMARY KEY, class_id INTEGER, level INTEGER, exp INTEGER, sp INTEGER, curHp INTEGER, curMp INTEGER, curCp INTEGER, maxHp INTEGER, maxMp INTEGER, maxCp INTEGER, active INTEGER, isBase INTEGER, death_penalty INTEGER)"
            )
        )
        if request.param == "mobius":
            conn.execute(
                text(
                    "CREATE TABLE items(object_id INTEGER PRIMARY KEY, owner_id INTEGER, item_id INTEGER CHECK(item_id != 999), count INTEGER, enchant_level INTEGER, loc TEXT, loc_data INTEGER)"
                )
            )
        else:
            conn.execute(
                text(
                    "CREATE TABLE items(item_id INTEGER PRIMARY KEY, owner_id INTEGER, item_type INTEGER CHECK(item_type != 999), amount INTEGER, enchant INTEGER, location TEXT, slot INTEGER)"
                )
            )
    gateway = SqlAlchemyLineageGateway(catalog)
    gateway._engine = engine
    yield gateway
    engine.dispose()


def create(gateway, name="Initial", items=None):
    return gateway.create_character(
        "player",
        name,
        0,
        10,
        0,
        start=CharacterStart(
            level=20,
            xp=100000,
            sp=123,
            title="Newbie",
            x=1,
            y=2,
            z=3,
            items=items
            if items is not None
            else (InitialItem(57, 500), InitialItem(100, 1, 3, 7)),
        ),
    )


def test_atomic_creation_persists_stats_inventory_and_equipment(gateway, db):
    char = create(gateway)
    assert char.level == 20 and char.title == "Newbie"
    with gateway._engine.connect() as conn:
        assert conn.execute(
            text("SELECT level,exp,sp FROM character_subclasses")
        ).one() == (20, 100000, 123)
        assert conn.execute(text("SELECT x,y,z,title FROM characters")).one() == (
            1,
            2,
            3,
            "Newbie",
        )
        assert conn.execute(text("SELECT COUNT(*) FROM items")).scalar() == 2
    assert [
        (it.item_id, it.quantity) for it in gateway.list_character_items(char.char_id)
    ] == [(57, 500)]
    equipment = gateway.list_character_equipment(char.char_id)
    assert [(it.item_id, it.enchant, it.slot) for it in equipment] == [(100, 3, 7)]
    with pytest.raises(NicknameTakenError):
        create(gateway)
    second = create(gateway, name="Second")
    assert second.char_id > char.char_id + 2
    with gateway._engine.connect() as conn:
        assert conn.execute(text("SELECT COUNT(*) FROM characters")).scalar() == 2
        assert conn.execute(text("SELECT COUNT(*) FROM items")).scalar() == 4


def test_failure_on_second_item_rolls_back_character_stats_and_first_item(gateway):
    with pytest.raises(IntegrityError):
        create(gateway, items=(InitialItem(57, 500), InitialItem(999)))
    with gateway._engine.connect() as conn:
        for table in ["characters", "character_subclasses", "items"]:
            assert conn.execute(text("SELECT COUNT(*) FROM " + table)).scalar() == 0
    # A corrected retry is possible and does not duplicate the kit.
    create(gateway)


@pytest.mark.parametrize("failure", ["lock", "engine"])
def test_creation_refuses_unsafe_storage_or_unavailable_lock(gateway, failure):
    if failure == "lock":
        gateway._sql._statements["creation_lock"] = "SELECT 0"
    else:
        gateway._sql._statements["creation_storage"] = (
            "SELECT 'items' AS table_name, 'MyISAM' AS engine"
        )
    with pytest.raises(CharacterServiceUnavailableError):
        create(gateway)
    with gateway._engine.connect() as conn:
        assert conn.execute(text("SELECT COUNT(*) FROM characters")).scalar() == 0
