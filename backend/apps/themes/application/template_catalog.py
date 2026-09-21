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


def fallback_presentation(*, name: str, description: str, renderer: str) -> dict:
    """Monta o contrato mínimo do catálogo quando o ZIP só traz identidade CSS."""

    title = name.strip() or "PDL"
    blurb = description.strip() or title
    canonical = resolve_renderer(renderer)
    presentation = {
        "renderer": canonical,
        "navigation": [
            {"label": "Início", "to": "/"},
            {"label": "Informações", "to": "/info"},
            {"label": "Rankings", "to": "/rankings"},
            {"label": "Notícias", "to": "/news"},
            {"label": "Downloads", "to": "/downloads"},
        ],
        "home": {
            "hero": {
                "title": title,
                "description": blurb,
                "countdownLabel": "Abertura",
                "countdownAt": "2099-01-01T00:00:00+00:00",
                "actionLabel": "Criar conta",
                "actionTo": "/register",
                "secondaryLabel": "Download",
                "secondaryTo": "/downloads",
            },
            "features": {
                "title": title,
                "subtitle": blurb,
                "actionLabel": "Saiba mais",
                "actionTo": "/info",
                "items": [{"title": title, "description": blurb, "asset": "images/logo.png"}],
            },
            "ranking": {
                "title": "Rankings",
                "subtitle": title,
                "actionLabel": "Ver todos",
                "actionTo": "/rankings",
                "tabs": [{"id": "pvp", "label": "PvP", "kind": "pvp"}],
            },
            "cta": {
                "title": title,
                "description": blurb,
                "actionLabel": "Criar conta",
                "actionTo": "/register",
            },
            "news": {"title": "Notícias"},
            "stats": {
                "items": [
                    {"id": "online", "label": "Online", "kind": "online"},
                    {"id": "chronicle", "label": "Crônica", "kind": "chronicle"},
                ]
            },
            "pillars": {"items": [{"title": title, "description": blurb}]},
        },
        "footer": {"tagline": blurb, "copyright": title},
        "shells": {
            "auth": {"kicker": title, "brand": title},
            "panel": {"kicker": title, "brand": title},
            "admin": {"kicker": title, "brand": title},
        },
    }
    if "stats" not in home_sections_for(canonical):
        del presentation["home"]["stats"]
        del presentation["home"]["pillars"]
    return presentation
