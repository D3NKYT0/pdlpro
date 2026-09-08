"""Sanitização de HTML permitido em campos de rich text (notícias, roadmap)."""

from __future__ import annotations

import bleach
from django.utils.html import strip_tags

ALLOWED_TAGS = [
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "ul",
    "ol",
    "li",
    "a",
    "h2",
    "h3",
    "blockquote",
    "code",
]
ALLOWED_ATTRIBUTES = {"a": ["href", "title", "rel", "target"]}
ALLOWED_PROTOCOLS = ["http", "https", "mailto"]


def is_rich_text_empty(value: str | None) -> bool:
    """Indica se o HTML não contém texto legível após remover as tags."""
    text = strip_tags(value or "").replace("\xa0", " ").strip()
    return not text


def sanitize_rich_text(value: str | None) -> str:
    """Remove tags e atributos perigosos, preservando a formatação permitida.

    Texto puro legado (sem tags) permanece como texto. Markup oco vira ``""``.
    """
    raw = (value or "").strip()
    if not raw:
        return ""
    cleaned = bleach.clean(
        raw,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        protocols=ALLOWED_PROTOCOLS,
        strip=True,
    ).strip()
    return "" if is_rich_text_empty(cleaned) else cleaned
