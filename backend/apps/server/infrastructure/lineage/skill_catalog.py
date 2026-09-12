from __future__ import annotations

import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from django.conf import settings

SKILL_RE = re.compile(r"<skill\b([^>]*)>([\s\S]*?)</skill>", re.IGNORECASE)
ATTR_ID_RE = re.compile(r'\bid\s*=\s*"(\d+)"', re.IGNORECASE)
ATTR_NAME_RE = re.compile(r'\bname\s*=\s*"([^"]*)"', re.IGNORECASE)
SET_RE = re.compile(r'<set\s+name="([^"]+)"\s+val="([^"]*)"\s*/>', re.IGNORECASE)
SPECIAL_NAME_RE = re.compile(r"(?i)\b(clan|heroic|noblesse|mentor(?:ing)?)\b")

DEFAULT_SKILL_ICON = "/skill-icons/default.png"

ATTACK_TYPES = {
    "PDAM",
    "MDAM",
    "DRAIN",
    "BLOW",
    "CHARGEDAM",
    "MANADAM",
    "AGGDAMAGE",
    "FATAL",
    "CPDAMPERCENT",
    "DEATHLINK",
    "STRIDER_SIEGE_ASSAULT",
    "PUMPING",
    "REELING",
    "ENCHANT_WEAPON",
}
DEFENSE_TYPES = {"REFLECT", "ENCHANT_ARMOR"}
BUFF_TYPES = {"BUFF", "CONT", "HOT", "MPHOT", "MANARECHARGE", "COMBATPOINTHEAL", "PASSIVE"}
DEBUFF_TYPES = {
    "DEBUFF",
    "POISON",
    "PARALYZE",
    "ROOT",
    "BLEED",
    "FEAR",
    "STUN",
    "MUTE",
    "WEAKNESS",
    "DOT",
    "SLEEP",
    "CONFUSION",
    "AGGDEBUFF",
    "MDOT",
    "WARRIOR_BANE",
    "MAGE_BANE",
    "BETRAY",
}
HEAL_TYPES = {
    "HEAL",
    "HEAL_PERCENT",
    "HEAL_STATIC",
    "MANAHEAL",
    "MANAHEAL_PERCENT",
    "BALANCE_LIFE",
    "RESURRECT",
    "CANCEL_DEBUFF",
}
SUMMON_TYPES = {"SUMMON", "SPAWN", "SUMMON_FRIEND", "SUMMON_PARTY", "SUMMON_CREATURE"}


def _decode_xml(value: str) -> str:
    return (
        value.replace("&apos;", "'")
        .replace("&quot;", '"')
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
    )


def classify_skill_operate(operate_type: str) -> str:
    value = (operate_type or "").strip().upper()
    if value == "PASSIVE":
        return "passive"
    if value == "TOGGLE":
        return "toggle"
    return "active"


def classify_skill_kind(skill_type: str) -> str:
    value = (skill_type or "").strip().upper()
    if value in ATTACK_TYPES:
        return "attack"
    if value in DEFENSE_TYPES:
        return "defense"
    if value in BUFF_TYPES:
        return "buff"
    if value in DEBUFF_TYPES:
        return "debuff"
    if value in HEAL_TYPES:
        return "heal"
    if value in SUMMON_TYPES:
        return "summon"
    return "utility"


def classify_is_magic(raw: str) -> bool:
    return (raw or "").strip().casefold() in {"true", "1", "yes"}


def classify_skill_group(*, skill_type: str, operate: str, is_magic: bool, name: str) -> str:
    """Pastas da janela de skills do cliente L2 (Physical, Magic, Reinforcement...)."""
    if SPECIAL_NAME_RE.search(name or ""):
        return "special"
    kind = classify_skill_kind(skill_type)
    if kind == "debuff":
        return "weaken"
    if operate == "passive":
        return "magic" if is_magic else "physical"
    if kind in {"buff", "defense"}:
        return "reinforcement"
    if kind in {"heal", "summon"} or is_magic:
        return "magic"
    if kind == "attack":
        return "physical"
    return "other"


@dataclass(frozen=True, slots=True)
class L2Skill:
    """Metadados de uma skill carregada do catálogo XML do Lineage."""

    id: int
    name: str
    operate: str = "active"
    kind: str = "utility"
    group: str = "other"
    is_magic: bool = False
    skill_type: str = ""


class LineageSkillCatalog:
    """Índice de nomes e categorias de skills lidos do XML em LINEAGE_SKILL_XML_DIR."""

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
        for match in SKILL_RE.finditer(xml):
            attrs, body = match.groups()
            raw_id = ATTR_ID_RE.search(attrs)
            raw_name = ATTR_NAME_RE.search(attrs)
            if not raw_id:
                continue
            name = _decode_xml(raw_name.group(1)).strip() if raw_name else ""
            if not name:
                continue
            sets = {key.casefold(): value for key, value in SET_RE.findall(body)}
            skill_type = (sets.get("skilltype") or "").strip().upper()
            operate = classify_skill_operate(sets.get("operatetype", ""))
            is_magic = classify_is_magic(sets.get("ismagic", ""))
            parsed.append(
                L2Skill(
                    id=int(raw_id.group(1)),
                    name=name,
                    operate=operate,
                    kind=classify_skill_kind(skill_type),
                    group=classify_skill_group(
                        skill_type=skill_type,
                        operate=operate,
                        is_magic=is_magic,
                        name=name,
                    ),
                    is_magic=is_magic,
                    skill_type=skill_type,
                )
            )
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
        "operate": skill.operate if skill else "active",
        "kind": skill.kind if skill else "utility",
        "group": skill.group if skill else "other",
        "is_magic": skill.is_magic if skill else False,
        "skill_type": skill.skill_type if skill else "",
    }
