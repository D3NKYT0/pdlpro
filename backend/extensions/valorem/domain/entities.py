from dataclasses import dataclass


@dataclass(frozen=True)
class ValoremWikiStatus:
    active: bool
    version: str
    total_items: int
    total_bosses: int
    total_skills: int
