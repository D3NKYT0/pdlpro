"""Catálogo de layouts públicos homologados no core.

`portal-v1` e `club-v1` permanecem como aliases. Layouts novos entram pelo
nome do template (vesperlyn, ironspine, …), sem release extra de renderer.
"""

from __future__ import annotations

RENDERER_ALIASES = {
    "portal-v1": "gemwright",
    "club-v1": "vesperlyn",
}

GEM_SECTIONS = ("hero", "features", "ranking", "cta", "news")
CLASSIC_SECTIONS = ("hero", "stats", "features", "pillars", "ranking", "cta", "news")

TEMPLATE_SECTIONS: dict[str, tuple[str, ...]] = {
    "vesperlyn": CLASSIC_SECTIONS,
    "gemwright": GEM_SECTIONS,
    "ironspine": CLASSIC_SECTIONS,
    "ashenledger": CLASSIC_SECTIONS,
    "warhorn": CLASSIC_SECTIONS,
    "ironpatch": CLASSIC_SECTIONS,
    "laurelwake": CLASSIC_SECTIONS,
    "meridian": CLASSIC_SECTIONS,
    "twinwake": CLASSIC_SECTIONS,
    "cartograph": CLASSIC_SECTIONS,
    "classing": CLASSIC_SECTIONS,
    "parchment": CLASSIC_SECTIONS,
    "obsidian": CLASSIC_SECTIONS,
    "hearthspire": CLASSIC_SECTIONS,
    "goldleaf": CLASSIC_SECTIONS,
    "lampmarket": CLASSIC_SECTIONS,
    "bracket": CLASSIC_SECTIONS,
    "eventide": CLASSIC_SECTIONS,
    "wayfarer": CLASSIC_SECTIONS,
    "watchfire": CLASSIC_SECTIONS,
}

SUPPORTED_RENDERERS = tuple(TEMPLATE_SECTIONS) + tuple(RENDERER_ALIASES)


def resolve_renderer(renderer: str) -> str:
    return RENDERER_ALIASES.get(renderer, renderer)


def is_supported_renderer(renderer: str) -> bool:
    return renderer in RENDERER_ALIASES or renderer in TEMPLATE_SECTIONS


def home_sections_for(renderer: str) -> tuple[str, ...]:
    return TEMPLATE_SECTIONS[resolve_renderer(renderer)]
