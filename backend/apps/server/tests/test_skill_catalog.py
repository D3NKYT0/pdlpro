from pathlib import Path

import pytest

from apps.server.infrastructure.lineage.skill_catalog import (
    LineageSkillCatalog,
    skill_display_name,
    skill_metadata,
)

SAMPLE = """
<list>
  <skill id="1" levels="37" name="Triple Slash">
    <set name="skillType" val="PDAM"/>
  </skill>
  <skill levels="2" name="Dash" id="4">
    <set name="skillType" val="BUFF"/>
  </skill>
  <skill id="99" levels="1" name="">
    <set name="skillType" val="DUMMY"/>
  </skill>
</list>
"""


def test_parses_skill_xml_catalog(tmp_path: Path):
    (tmp_path / "0000-0099.xml").write_text(SAMPLE, encoding="utf-8")
    catalog = LineageSkillCatalog.load(tmp_path)
    slash = catalog.get(1)
    assert slash is not None
    assert slash.name == "Triple Slash"
    dash = catalog.get(4)
    assert dash is not None
    assert dash.name == "Dash"
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
    assert skill_display_name(1) == "Triple Slash"
    assert skill_metadata(1)["icon_url"] == "/skill-icons/1.png"
    assert skill_display_name(99999999) == "Skill 99999999"
