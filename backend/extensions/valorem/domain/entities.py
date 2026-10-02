from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class ValoremWikiStatus:
    active: bool
    version: str
    total_items: int
    total_bosses: int
    total_skills: int
