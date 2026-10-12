from unittest.mock import Mock

import pytest
from django.core.exceptions import ValidationError

from apps.server.application.use_cases import (
    RunPublicLineageQueryInput,
    RunPublicLineageQueryUseCase,
)
from apps.server.infrastructure.boss_catalog import RankingBoss
from apps.server.infrastructure.lineage.npc_catalog import XmlNpcCatalog, _load_catalog


@pytest.fixture(autouse=True)
def clear_npc_cache():
    _load_catalog.cache_clear()
    yield
    _load_catalog.cache_clear()


def test_xml_metadata_names_entities_and_invalid_rows(tmp_path):
    (tmp_path / "npc.xml").write_text('''<?xml version="1.0"?>
        <!DOCTYPE list SYSTEM "npc.dtd"><list>
        <npc id="25001" name="Dragon &amp; Guard"><set name="level" value="80" /></npc>
        <npc id="90001" name="Custom"><set name="level" val="85" /></npc>
        <npc id="bad" name="Broken" />
        <npc id="2" name="" />
        </list>''', encoding="utf-8")
    (tmp_path / "broken.xml").write_text("<broken", encoding="utf-8")
    catalog = XmlNpcCatalog(tmp_path)
    assert catalog.get(25001) == {"name": "Dragon & Guard", "level": 80}
    assert catalog.get(90001) == {"name": "Custom", "level": 85}
    assert catalog.get(99999) is None
    assert XmlNpcCatalog(tmp_path / "missing").get(25001) is None


def test_modified_collection_is_reloaded_for_next_request(tmp_path):
    path = tmp_path / "npc.xml"
    path.write_text('<list><npc id="1" name="First" /></list>', encoding="utf-8")
    assert XmlNpcCatalog(tmp_path).get(1)["name"] == "First"
    path.write_text('<list><npc id="1" name="Changed name" /></list>', encoding="utf-8")
    assert XmlNpcCatalog(tmp_path).get(1)["name"] == "Changed name"


@pytest.mark.django_db
def test_admin_name_can_be_resolved_from_xml_but_unknown_requires_name(settings, tmp_path):
    settings.LINEAGE_NPC_XML_DIR = str(tmp_path)
    (tmp_path / "npc.xml").write_text('<list><npc id="25001" name="Known Raid" /></list>', encoding="utf-8")
    boss = RankingBoss(npc_id=25001, name="", category="raid", source="raid")
    boss.full_clean()
    assert boss.name == "Known Raid"
    with pytest.raises(ValidationError, match="acervo"):
        RankingBoss(npc_id=90001, name="").full_clean()
    custom = RankingBoss(npc_id=90001, name="Custom")
    custom.full_clean()
    assert custom.name == "Custom"


def test_ranking_uses_xml_name_and_level_without_overwriting_custom_name(tmp_path):
    (tmp_path / "npc.xml").write_text('<list><npc id="25001" name="Known Raid" level="80" /></list>', encoding="utf-8")
    gateway, bosses = Mock(), Mock()
    gateway.query.return_value = [{"boss_id": 25001, "respawn": 0}]
    bosses.list_all.return_value = []
    use_case = RunPublicLineageQueryUseCase(gateway, bosses, XmlNpcCatalog(tmp_path))
    assert use_case.execute(RunPublicLineageQueryInput("raidboss_status")) == [
        {"boss_id": 25001, "name": "Known Raid", "level": 80, "respawn": 0},
    ]
    bosses.list_all.return_value = [{"npc_id": 25001, "name": "Renamed", "source": "raid", "category": "raid", "active": True}]
    assert use_case.execute(RunPublicLineageQueryInput("raidboss_status"))[0]["name"] == "Renamed"
