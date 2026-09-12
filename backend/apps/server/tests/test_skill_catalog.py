from pathlib import Path

import pytest

from apps.server.infrastructure.lineage.skill_catalog import (
    LineageSkillCatalog,
    classify_skill_group,
    classify_skill_kind,
    classify_skill_operate,
    resolve_skill_progress,
    skill_display_name,
    skill_metadata,
    skill_progress,
)

SAMPLE = """
<list>
  <skill id="1" levels="37" name="Triple Slash" enchantLevels1="30" enchantLevels2="30">
    <set name="skillType" val="PDAM"/>
    <set name="operateType" val="ACTIVE"/>
  </skill>
  <skill levels="2" name="Dash" id="4">
    <set name="skillType" val="BUFF"/>
    <set name="operateType" val="ACTIVE"/>
  </skill>
  <skill id="141" levels="3" name="Weapon Mastery">
    <set name="skillType" val="BUFF"/>
    <set name="operateType" val="PASSIVE"/>
  </skill>
  <skill id="1177" levels="5" name="Wind Strike">
    <set name="skillType" val="MDAM"/>
    <set name="operateType" val="ACTIVE"/>
    <set name="isMagic" val="true"/>
  </skill>
  <skill id="395" levels="1" name="Heroic Miracle">
    <set name="skillType" val="BUFF"/>
    <set name="operateType" val="ACTIVE"/>
  </skill>
  <skill id="99" levels="1" name="">
    <set name="skillType" val="DUMMY"/>
  </skill>
</list>
"""


def test_classifies_operate_kind_and_l2_window_group():
    assert classify_skill_operate("ACTIVE") == "active"
    assert classify_skill_operate("passive") == "passive"
    assert classify_skill_operate("TOGGLE") == "toggle"
    assert classify_skill_kind("PDAM") == "attack"
    assert classify_skill_kind("STUN") == "debuff"
    assert classify_skill_kind("HEAL") == "heal"
    assert (
        classify_skill_group(skill_type="PDAM", operate="active", is_magic=False, name="Triple Slash")
        == "physical"
    )
    assert (
        classify_skill_group(skill_type="MDAM", operate="active", is_magic=True, name="Wind Strike")
        == "magic"
    )
    assert classify_skill_group(skill_type="BUFF", operate="active", is_magic=False, name="Dash") == "reinforcement"
    assert classify_skill_group(skill_type="STUN", operate="active", is_magic=True, name="Anchor") == "weaken"
    assert (
        classify_skill_group(skill_type="BUFF", operate="passive", is_magic=False, name="Weapon Mastery")
        == "physical"
    )
    assert (
        classify_skill_group(skill_type="BUFF", operate="active", is_magic=False, name="Heroic Miracle")
        == "special"
    )
    assert classify_skill_group(skill_type="RECALL", operate="active", is_magic=False, name="Recall") == "other"


def test_decodes_l2j_skill_enchant_from_stored_level():
    routes = (30, 30)
    unenchanted = resolve_skill_progress(37, 37, routes)
    assert unenchanted["level"] == 37
    assert unenchanted["enchant"] == 0
    assert unenchanted["enchantable"] is True
    assert unenchanted["enchant_max"] == 30
    plus_one = resolve_skill_progress(38, 37, routes)
    assert plus_one == {"level": 37, "enchant": 1, "enchant_route": 1, "enchant_max": 30, "enchantable": True}
    plus_thirty = resolve_skill_progress(67, 37, routes)
    assert plus_thirty["enchant"] == 30
    assert plus_thirty["enchant_route"] == 1
    route_two = resolve_skill_progress(68, 37, routes)
    assert route_two == {"level": 37, "enchant": 1, "enchant_route": 2, "enchant_max": 30, "enchantable": True}
    plain = resolve_skill_progress(9, 9, ())
    assert plain["enchant"] == 0
    assert plain["enchantable"] is False


def test_parses_skill_xml_catalog(tmp_path: Path):
    (tmp_path / "0000-0099.xml").write_text(SAMPLE, encoding="utf-8")
    catalog = LineageSkillCatalog.load(tmp_path)
    slash = catalog.get(1)
    assert slash is not None
    assert slash.name == "Triple Slash"
    assert slash.operate == "active"
    assert slash.kind == "attack"
    assert slash.group == "physical"
    assert slash.skill_type == "PDAM"
    assert slash.max_level == 37
    assert slash.enchant_routes == (30, 30)
    dash = catalog.get(4)
    assert dash is not None
    assert dash.group == "reinforcement"
    mastery = catalog.get(141)
    assert mastery is not None
    assert mastery.operate == "passive"
    assert mastery.group == "physical"
    wind = catalog.get(1177)
    assert wind is not None
    assert wind.is_magic is True
    assert wind.group == "magic"
    hero = catalog.get(395)
    assert hero is not None
    assert hero.group == "special"
    assert catalog.get(99) is None
    assert catalog.name_for(1) == "Triple Slash"
    assert catalog.name_for(99999) == "Skill 99999"


@pytest.mark.django_db
def test_real_xml_has_triple_slash():
    catalog = LineageSkillCatalog.load()
    skill = catalog.get(1)
    if skill is None:
        pytest.skip("XML do catálogo de skills L2 não está presente")
    assert skill.name == "Triple Slash"
    assert skill.operate == "active"
    assert skill.kind == "attack"
    assert skill.group == "physical"
    assert skill.max_level == 37
    assert skill.enchant_routes == (30, 30)
    assert skill_progress(1, 52)["enchant"] == 15
    assert skill_progress(1, 52)["level"] == 37
    confusion = catalog.get(2)
    if confusion is not None:
        assert confusion.kind == "debuff"
        assert confusion.group == "weaken"
        assert confusion.operate == "active"
    assert skill_display_name(1) == "Triple Slash"
    assert skill_metadata(1)["icon_url"] == "/skill-icons/1.png"
    assert skill_metadata(1)["group"] == "physical"
    assert skill_display_name(99999999) == "Skill 99999999"
    unknown = skill_metadata(99999999)
    assert unknown["operate"] == "active"
    assert unknown["kind"] == "utility"
    assert unknown["group"] == "other"
