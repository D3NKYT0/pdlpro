from __future__ import annotations

import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from django.conf import settings

ITEM_RE = re.compile(
    r"<(weapon|armor|etcitem)\s+id=\"(\d+)\"\s+name=\"([^\"]*)\"[^>]*>([\s\S]*?)</\1>",
    re.IGNORECASE,
)
SET_RE = re.compile(r"<set\s+name=\"([^\"]+)\"\s+value=\"([^\"]*)\"\s*/>")
SLOT_RE = re.compile(r"<slot\s+id=\"([^\"]+)\"\s*/>")


def _decode_xml(value: str) -> str:
    return (
        value.replace("&apos;", "'")
        .replace("&quot;", '"')
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
    )


def _map_grade(crystal_type: str) -> str:
    value = (crystal_type or "NONE").upper()
    if value in {"D", "C", "B", "A", "S"}:
        return value
    if value.startswith("S"):
        return "S"
    return "NG"


def _classify(kind: str, item_type: str, slots: list[str]) -> str:
    slot_set = set(slots)
    item_type = (item_type or "").upper()
    if kind == "etcitem":
        return "COMUM"
    if kind == "weapon":
        if item_type in {"SHIELD", "SIGIL"}:
            return "SHIELD"
        if "LEFT_HAND" in slot_set and "RIGHT_HAND" not in slot_set and "LEFT_RIGHT_HAND" not in slot_set:
            return "SHIELD"
        return "WEAPON"
    if "HEAD" in slot_set:
        return "HELMET"
    if "FULL_ARMOR" in slot_set or "CHEST" in slot_set:
        return "ARMOR"
    if "LEGS" in slot_set:
        return "PANTS"
    if "FEET" in slot_set:
        return "BOOTS"
    if "GLOVES" in slot_set:
        return "GLOVES"
    if "NECKLACE" in slot_set or "NECK" in slot_set:
        return "NECKLACE"
    if slot_set & {"RIGHT_EAR", "LEFT_EAR", "REAR", "LEAR", "EAR"}:
        return "EARRING"
    if slot_set & {"RIGHT_FINGER", "LEFT_FINGER", "RFINGER", "LFINGER", "FINGER"}:
        return "RING"
    if "LEFT_HAND" in slot_set or "LHAND" in slot_set:
        return "SHIELD"
    if "HAIR" in slot_set or "HAIR_ALL" in slot_set:
        return "HAIR"
    if "FACE" in slot_set:
        return "FACE"
    if "UNDERWEAR" in slot_set:
        return "UNDERWEAR"
    if "FORMAL_WEAR" in slot_set:
        return "FORMAL"
    if slot_set & {"WOLF", "HATCHLING", "STRIDER", "BABY_PET"}:
        return "PET"
    return "COMUM"


@dataclass(frozen=True, slots=True)
class L2Item:
    id: int
    name: str
    category: str
    grade: str
    icon: str = ""


class LineageItemCatalog:
    """Catálogo Interlude lido dos XML em backend/data/items."""

    def __init__(self, items: dict[int, L2Item]) -> None:
        self._items = items

    def get(self, item_id: int) -> L2Item | None:
        return self._items.get(int(item_id))

    def name_for(self, item_id: int, fallback: str | None = None) -> str:
        item = self.get(item_id)
        if item:
            return item.name
        return fallback or f"Item {item_id}"

    def search(self, query: str, limit: int = 20) -> list[L2Item]:
        trimmed = query.strip()
        if not trimmed:
            return []
        if trimmed.isdigit():
            exact = self.get(int(trimmed))
            if exact:
                return [exact]
            prefix = []
            for item in self._items.values():
                if str(item.id).startswith(trimmed):
                    prefix.append(item)
                    if len(prefix) >= limit:
                        break
            return prefix
        needle = trimmed.casefold()
        starts: list[L2Item] = []
        contains: list[L2Item] = []
        for item in self._items.values():
            name = item.name.casefold()
            if name.startswith(needle):
                starts.append(item)
            elif needle in name:
                contains.append(item)
            if len(starts) >= limit:
                break
        return (starts + contains)[:limit]

    @classmethod
    def default_root(cls) -> Path:
        return Path(settings.BASE_DIR) / "data" / "items"

    @classmethod
    def load(cls, root: Path | None = None) -> LineageItemCatalog:
        folder = root or cls.default_root()
        items: dict[int, L2Item] = {}
        if not folder.is_dir():
            return cls(items)
        for path in sorted(folder.glob("*.xml")):
            for item in cls._parse(path.read_text(encoding="utf-8")):
                items[item.id] = item
        return cls(items)

    @classmethod
    def _parse(cls, xml: str) -> list[L2Item]:
        parsed: list[L2Item] = []
        for match in ITEM_RE.finditer(xml):
            kind, raw_id, raw_name, body = match.groups()
            name = _decode_xml(raw_name).strip()
            if not name or re.search(r"not in use", name, re.I) or re.fullmatch(r"not used", name, re.I):
                continue
            sets = {key: value for key, value in SET_RE.findall(body)}
            slots: list[str] = []
            for slot_value in SLOT_RE.findall(body):
                slots.extend(part.strip() for part in slot_value.split(";") if part.strip())
            parsed.append(
                L2Item(
                    id=int(raw_id),
                    name=name,
                    category=_classify(kind.lower(), sets.get("type", ""), slots),
                    grade=_map_grade(sets.get("crystal_type", "NONE")),
                    icon=sets.get("icon", ""),
                )
            )
        return parsed


@lru_cache(maxsize=1)
def get_item_catalog() -> LineageItemCatalog:
    return LineageItemCatalog.load()


def item_display_name(item_id: int, fallback: str | None = None) -> str:
    return get_item_catalog().name_for(item_id, fallback=fallback)
