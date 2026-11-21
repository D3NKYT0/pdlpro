from base64 import b64decode
from io import BytesIO

import pytest
from PIL import Image
from sqlalchemy import create_engine

from apps.server.domain.exceptions import CharacterServiceUnavailableError
from apps.server.infrastructure.lineage.catalog import LineageQueryCatalog
from apps.server.infrastructure.sqlalchemy_gateway import SqlAlchemyLineageGateway


@pytest.fixture
def eternity():
    engine = create_engine("sqlite://")
    with engine.begin() as connection:
        connection.exec_driver_sql(
            "CREATE TABLE characters (charId INTEGER PRIMARY KEY, account_name TEXT, "
            "char_name TEXT, level INTEGER, classid INTEGER, online INTEGER, sex INTEGER, "
            "pvpkills INTEGER, pkkills INTEGER, clanid INTEGER, onlinetime INTEGER, accesslevel INTEGER, "
            "title TEXT DEFAULT '', karma INTEGER DEFAULT 0, lastAccess INTEGER DEFAULT 0, "
            "hairStyle INTEGER DEFAULT 0, hairColor INTEGER DEFAULT 0, face INTEGER DEFAULT 0)"
        )
        connection.exec_driver_sql(
            "CREATE TABLE clan_data (clan_id INTEGER PRIMARY KEY, clan_name TEXT, leader_id INTEGER, "
            "ally_id INTEGER, ally_name TEXT, crest_id INTEGER, ally_crest_id INTEGER, "
            "clan_level INTEGER, reputation_score INTEGER)"
        )
        connection.exec_driver_sql("CREATE TABLE crests (crest_id INTEGER PRIMARY KEY, data BLOB)")
        connection.exec_driver_sql(
            "CREATE TABLE items (object_id INTEGER PRIMARY KEY, owner_id INTEGER, item_id INTEGER, "
            "count INTEGER, enchant_level INTEGER, loc TEXT, loc_data INTEGER)"
        )
        connection.exec_driver_sql(
            "CREATE TABLE accounts (login TEXT PRIMARY KEY, password TEXT NOT NULL, "
            "email TEXT, accessLevel INTEGER DEFAULT 0)"
        )
        connection.exec_driver_sql(
            "INSERT INTO characters "
            "(charId, account_name, char_name, level, classid, online, sex, pvpkills, pkkills, "
            "clanid, onlinetime, accesslevel) VALUES "
            "(42, 'owner', 'Aster', 80, 93, 0, 1, 12, 2, 5, 3600, 0), "
            "(43, 'owner', 'Ceres', 45, 20, 0, 0, 5, 0, 0, 7200, 0), "
            "(44, 'other', 'Castor', 82, 98, 1, 0, 15, 1, 5, 1200, 0), "
            "(45, 'staff', 'Admin', 85, 98, 1, 0, 99, 99, 0, 1200, 100)"
        )
        connection.exec_driver_sql(
            "INSERT INTO clan_data VALUES (5, 'Dragons', 42, 8, 'Orion', 1, 2, 6, 100)"
        )
        for crest_id, color in ((1, "red"), (2, "blue")):
            blob = BytesIO()
            Image.new("RGB", (1, 1), color).save(blob, format="PNG")
            connection.exec_driver_sql("INSERT INTO crests VALUES (?, ?)", (crest_id, blob.getvalue()))
        connection.exec_driver_sql(
            "INSERT INTO items VALUES "
            "(10, 42, 57, 150, 0, 'INVENTORY', 0), "
            "(11, 42, 57, 50, 0, 'WAREHOUSE', 0), "
            "(12, 42, 57, 1000, 0, 'AUCTION', 0), "
            "(13, 42, 900, 1, 5, 'PAPERDOLL', 6), "
            "(14, 44, 57, 500, 0, 'INVENTORY', 0)"
        )
    gateway = SqlAlchemyLineageGateway(LineageQueryCatalog.load("eternity"))
    gateway._engine = engine
    yield gateway
    engine.dispose()


def test_loads_owned_characters_and_alliance_from_clan_data(eternity):
    aster, ceres = eternity.list_characters("owner")
    assert (aster.char_id, aster.name, aster.level, aster.class_id) == (42, "Aster", 80, 93)
    assert (aster.clan_name, aster.is_clan_leader, aster.ally_id, aster.ally_name) == (
        "Dragons", True, 8, "Orion",
    )
    assert aster.adena == 200
    with Image.open(BytesIO(b64decode(aster.clan_crest_base64))) as crest:
        assert crest.getpixel((0, 0)) == (255, 0, 0, 255)
    with Image.open(BytesIO(b64decode(aster.ally_crest_base64))) as crest:
        assert crest.getpixel((0, 0)) == (0, 0, 255, 255)
    assert (ceres.clan_name, ceres.ally_name, ceres.adena) == ("", "", 0)
    assert eternity.get_character("owner", 42) == aster
    assert eternity.get_character("other", 42) is None
    assert eternity.list_characters("missing") == []
    assert eternity.verify_character_ownership(42, "owner")
    assert not eternity.verify_character_ownership(42, "other")


def test_ranks_players_and_clans_with_the_eternity_schema(eternity):
    pvp = eternity.get_top_pvp(2)
    assert [(entry.name, entry.value) for entry in pvp] == [("Castor", 15), ("Aster", 12)]
    assert [(entry.name, entry.value) for entry in eternity.get_top_adena(2)] == [
        ("Castor", 500), ("Aster", 200),
    ]
    clan, = eternity.get_top_clans(1)
    assert (clan.name, clan.value, clan.extra["ally_name"], clan.extra["leader"]) == (
        "Dragons", 100, "Orion", "Aster",
    )
    assert clan.extra["members"] == 2


@pytest.mark.django_db
def test_reads_inventory_and_equipment_through_the_gateway(eternity):
    items = eternity.list_character_items(42)
    assert [(item.item_id, item.quantity, item.location) for item in items] == [
        (57, 150, "INVENTORY"), (57, 50, "WAREHOUSE"),
    ]
    equipped, = eternity.list_character_equipment(42)
    assert (equipped.item_id, equipped.enchant, equipped.slot) == (900, 5, 6)


def test_prepares_and_links_accounts_on_the_existing_schema(eternity, settings):
    settings.LINEAGE_QUERY_MODULE = "eternity"
    settings.LINEAGE_PASSWORD_ALGO = ""
    eternity.register_account("owner", "game-password", "owner@example.test")
    assert eternity.validate_credentials("owner", "game-password")
    assert not eternity.validate_credentials("owner", "wrong-password")

    panel_user = "81ada3bf-34de-456d-be0a-62110bf6c5c2"
    assert eternity.link_account("owner", panel_user).linked_user_id == panel_user
    eternity.unlink_account("owner", panel_user)
    assert eternity.get_account("owner").linked_user_id is None


def test_olympiad_uses_competition_classes_and_only_current_heroes(eternity):
    with eternity._engine.begin() as connection:
        connection.exec_driver_sql(
            "CREATE TABLE olympiad_nobles (charId INTEGER, class_id INTEGER, olympiad_points INTEGER)"
        )
        connection.exec_driver_sql(
            "INSERT INTO olympiad_nobles VALUES (42, 94, 125), (44, 99, 100), (99, 1, 999)"
        )
        connection.exec_driver_sql(
            "CREATE TABLE heroes (charId INTEGER, class_id INTEGER, count INTEGER, played INTEGER, active INTEGER)"
        )
        connection.exec_driver_sql("INSERT INTO heroes VALUES (42, 94, 2, 1, 1), (44, 99, 1, 1, 0)")

    ranking = eternity.query("olympiad_ranking")
    assert [(row["name"], row["class_id"], row["value"]) for row in ranking] == [
        ("Aster", 94, 125), ("Castor", 99, 100),
    ]
    assert [row["name"] for row in eternity.query("olympiad_all_heroes")] == ["Aster", "Castor"]
    assert [row["name"] for row in eternity.query("olympiad_current_heroes")] == ["Aster"]


def test_missing_delivery_and_character_creation_fail_before_connecting(eternity, settings, monkeypatch):
    settings.LINEAGE_ALLOW_ONLINE_DELIVERY = True

    def unexpected_connection():
        pytest.fail("Uma operação indisponível não deve abrir conexão com o jogo.")

    monkeypatch.setattr(eternity, "_engine_or_create", unexpected_connection)
    assert not eternity.allows_online_delivery()
    with pytest.raises(CharacterServiceUnavailableError):
        eternity.deposit_item("Aster", 57, 10, 0)
    with pytest.raises(CharacterServiceUnavailableError):
        eternity.assert_exchange_ready()
    with pytest.raises(CharacterServiceUnavailableError):
        eternity.create_character("owner", "Sirius", 0, 0, 0)
