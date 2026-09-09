"""Helpers de idioma de produto (pt|en|es) com fallback para português."""

from __future__ import annotations

from typing import Any

SUPPORTED_CONTENT_LANGUAGES = frozenset({"pt", "en", "es"})


def resolve_language(value: str | None, default: str = "pt") -> str:
    """Normaliza ``lang`` da query/API; valores desconhecidos caem no padrão PT."""

    language = (value or default).strip().lower()
    return language if language in SUPPORTED_CONTENT_LANGUAGES else default


def localized_text(item: Any, field: str, language: str) -> str:
    """Lê ``field_<lang>`` quando preenchido; caso contrário devolve o campo base (PT)."""

    if language in {"en", "es"}:
        value = getattr(item, f"{field}_{language}", None) or ""
        if str(value).strip():
            return value
    return getattr(item, field, "") or ""
