import pytest

from apps.server.infrastructure.lineage.catalog import LineageQueryCatalog, QueryDialectNotFoundError


def test_lucerav2_catalog_loads_required_queries():
    catalog = LineageQueryCatalog.load("lucerav2")
    assert catalog.dialect == "lucerav2"
    assert "obj_Id" in catalog["list_characters"]
    assert "character_subclasses" in catalog["list_characters"]
    assert "title" in catalog["list_characters"]
    assert "is_clan_leader" in catalog["get_character"]
    assert catalog["top_pvp"].lstrip().upper().startswith("SELECT")


def test_dreamv3_catalog_uses_charid():
    catalog = LineageQueryCatalog.load("dreamv3")
    assert "charId" in catalog["list_characters"]
    assert "obj_Id" not in catalog["transfer_character"]


def test_mobius_catalog_exposes_read_only_paperdoll_query():
    catalog = LineageQueryCatalog.load("mobius")
    assert "PAPERDOLL" in catalog["list_character_equipment"]
    assert "loc_data AS slot" in catalog["list_character_equipment"]


def test_mobius_deposit_matches_items_delayed_schema():
    catalog = LineageQueryCatalog.load("mobius")
    deposit_sql = catalog["deposit_item"]

    assert "attribute" in deposit_sql
    assert "attribute_level" in deposit_sql
    assert "variationId1" not in deposit_sql
    assert "payment_id" not in deposit_sql


def test_unknown_dialect_fails():
    with pytest.raises(QueryDialectNotFoundError):
        LineageQueryCatalog.load("nao_existe")
