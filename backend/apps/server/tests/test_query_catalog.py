import pytest

from apps.server.infrastructure.lineage.catalog import (
    LineageQueryCatalog,
    QueryDialectNotFoundError,
    QueryNotFoundError,
)


def test_lucerav2_catalog_loads_required_queries():
    catalog = LineageQueryCatalog.load("lucerav2")
    assert catalog.dialect == "lucerav2"
    assert "obj_Id" in catalog["list_characters"]
    assert "character_subclasses" in catalog["list_characters"]
    assert "title" in catalog["list_characters"]
    assert "is_clan_leader" in catalog["get_character"]
    assert catalog["top_pvp"].lstrip().upper().startswith("SELECT")
    assert "char_obj_id" in catalog["list_character_skills"]


def test_dreamv3_catalog_matches_character_schema():
    catalog = LineageQueryCatalog.load("dreamv3")
    assert "obj_Id" in catalog["list_characters"]
    assert "character_subclasses" in catalog["list_characters"]
    assert "clan_subpledges" in catalog["list_characters"]
    assert "obj_Id" in catalog["transfer_character"]


def test_mobius_catalog_exposes_read_only_paperdoll_query():
    catalog = LineageQueryCatalog.load("mobius")
    assert "PAPERDOLL" in catalog["list_character_equipment"]
    assert "loc_data AS slot" in catalog["list_character_equipment"]
    assert "charId" in catalog["list_character_skills"]


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


def test_rejects_unsafe_dialect_names():
    with pytest.raises(QueryDialectNotFoundError):
        LineageQueryCatalog.load("../lucerav2")
    with pytest.raises(QueryDialectNotFoundError):
        LineageQueryCatalog.load("lucerav2/../../secret")


def _stub_required_sql(folder, extra=None):
    extra = extra or {}
    chunks = []
    for name in LineageQueryCatalog.REQUIRED:
        sql = extra.get(name, f"SELECT 1 AS {name}")
        chunks.append(f"-- name: {name}\n{sql}\n")
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "required.sql").write_text("\n".join(chunks), encoding="utf-8")


def test_loads_full_dialect_from_extension_root(tmp_path):
    dialect_dir = tmp_path / "acme_l2j"
    _stub_required_sql(dialect_dir, extra={"top_pvp": "SELECT 'acme' AS name"})
    catalog = LineageQueryCatalog.load("acme_l2j", extra_roots=[tmp_path])
    assert catalog.dialect == "acme_l2j"
    assert "acme" in catalog["top_pvp"]
    assert catalog.has("deposit_item")


def test_extension_overlay_replaces_named_query_and_keeps_core(tmp_path):
    overlay = tmp_path / "lucerav2"
    overlay.mkdir()
    (overlay / "rankings.sql").write_text(
        "-- name: top_pvp\nSELECT 'from-extension' AS overlay\n",
        encoding="utf-8",
    )
    catalog = LineageQueryCatalog.load("lucerav2", extra_roots=[tmp_path])
    assert "from-extension" in catalog["top_pvp"]
    assert "obj_Id" in catalog["list_characters"]
    assert catalog["top_pvp"].lstrip().upper().startswith("SELECT")


def test_incomplete_extension_dialect_fails_required(tmp_path):
    dialect_dir = tmp_path / "broken"
    dialect_dir.mkdir()
    (dialect_dir / "only.sql").write_text("-- name: players_online\nSELECT 1\n", encoding="utf-8")
    with pytest.raises(QueryNotFoundError, match="incompleto"):
        LineageQueryCatalog.load("broken", extra_roots=[tmp_path])


def test_discover_dialects_includes_extension_folders(tmp_path):
    (tmp_path / "acme_fork").mkdir()
    names = LineageQueryCatalog.discover_dialects(extra_roots=[tmp_path])
    assert "lucerav2" in names
    assert "acme_fork" in names
