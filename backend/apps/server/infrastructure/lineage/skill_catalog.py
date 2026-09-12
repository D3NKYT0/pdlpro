from __future__ import annotations

import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from django.conf import settings

SKILL_OPEN_RE = re.compile(r"<skill\b([^>]*)>", re.IGNORECASE)
ATTR_ID_RE = re.compile(r'\bid\s*=\s*"(\d+)"', re.IGNORECASE)
ATTR_NAME_RE = re.compile(r'\bname\s*=\s*"([^"]*)"', re.IGNORECASE)

DEFAULT_SKILL_ICON = "/skill-icons/default.png"


def _decode_xml(value: str) -> str:
    return (
        value.replace("&apos;", "'")
        .replace("&quot;", '"')
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
    )


@dataclass(frozen=True, slots=True)
class L2Skill:
    """Metadados de uma skill carregada do catálogo XML do Lineage."""

    id: int
    name: str


class LineageSkillCatalog:
    """Índice de nomes de skills lidos do XML em LINEAGE_SKILL_XML_DIR."""

    def __init__(self, skills: dict[int, L2Skill]) -> None:
        self._skills = skills

    def get(self, skill_id: int) -> L2Skill | None:
        return self._skills.get(int(skill_id))

    def name_for(self, skill_id: int, fallback: str | None = None) -> str:
        skill = self.get(skill_id)
        if skill:
            return skill.name
        return fallback if fallback is not None else f"Skill {int(skill_id)}"

    @classmethod
    def default_root(cls) -> Path:
        configured = getattr(settings, "LINEAGE_SKILL_XML_DIR", "")
        if not configured:
            return Path(settings.BASE_DIR) / "data" / "skills"
        folder = Path(configured)
        return folder if folder.is_absolute() else Path(settings.BASE_DIR) / folder

    @classmethod
    def load(cls, root: Path | None = None) -> LineageSkillCatalog:
        folder = root or cls.default_root()
        skills: dict[int, L2Skill] = {}
        if not folder.is_dir():
            return cls(skills)
        for path in sorted(folder.rglob("*.xml")):
            for skill in cls._parse(path.read_text(encoding="utf-8")):
                skills[skill.id] = skill
        return cls(skills)

    @classmethod
    def _parse(cls, xml: str) -> list[L2Skill]:
        parsed: list[L2Skill] = []
        for match in SKILL_OPEN_RE.finditer(xml):
            attrs = match.group(1)
            raw_id = ATTR_ID_RE.search(attrs)
            raw_name = ATTR_NAME_RE.search(attrs)
            if not raw_id:
                continue
            name = _decode_xml(raw_name.group(1)).strip() if raw_name else ""
            if not name:
                continue
            parsed.append(L2Skill(id=int(raw_id.group(1)), name=name))
        return parsed


@lru_cache(maxsize=1)
def get_skill_catalog() -> LineageSkillCatalog:
    return LineageSkillCatalog.load()


def skill_display_name(skill_id: int, fallback: str | None = None) -> str:
    return get_skill_catalog().name_for(skill_id, fallback=fallback)


def skill_metadata(skill_id: int) -> dict:
    skill_id = int(skill_id)
    skill = get_skill_catalog().get(skill_id)
    return {
        "id": str(skill_id),
        "name": skill.name if skill else f"Skill {skill_id}",
        "icon_url": f"/skill-icons/{skill_id}.png",
        "catalog_found": skill is not None,
    }
