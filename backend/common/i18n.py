"""Helpers de idioma de produto (pt|en|es) e ativação do Django gettext.

O domínio permanece sem Django: mensagens de ``DomainError`` usam português como
msgid. A apresentação ativa o locale e aplica ``gettext`` na borda HTTP.
Conteúdo CMS continua em campos ``*_en`` / ``*_es`` via ``localized_text``.
"""

from __future__ import annotations

from typing import Any

from django.utils import translation

SUPPORTED_CONTENT_LANGUAGES = frozenset({"pt", "en", "es"})

# Código de produto (SPA / ?lang=) → código Django (settings.LANGUAGES).
PRODUCT_TO_DJANGO = {
    "pt": "pt-br",
    "en": "en",
    "es": "es",
}

DJANGO_TO_PRODUCT = {
    "pt-br": "pt",
    "pt": "pt",
    "en": "en",
    "es": "es",
}


def resolve_language(value: str | None, default: str = "pt") -> str:
    """Normaliza ``lang`` da query/API; valores desconhecidos caem no padrão PT."""

    language = (value or default).strip().lower().replace("_", "-")
    if language in SUPPORTED_CONTENT_LANGUAGES:
        return language
    if language.startswith("pt"):
        return "pt"
    if language.startswith("en"):
        return "en"
    if language.startswith("es"):
        return "es"
    return default


def parse_accept_language(header: str | None) -> str | None:
    """Primeiro idioma de produto suportado em ``Accept-Language``, ou ``None``."""

    if not header:
        return None
    for part in header.split(","):
        token = part.split(";", 1)[0].strip().lower().replace("_", "-")
        if not token or token == "*":
            continue
        if token in SUPPORTED_CONTENT_LANGUAGES:
            return token
        if token.startswith("pt"):
            return "pt"
        if token.startswith("en"):
            return "en"
        if token.startswith("es"):
            return "es"
    return None


def to_django_language(language: str) -> str:
    """Converte código de produto para o código Django correspondente."""

    return PRODUCT_TO_DJANGO.get(resolve_language(language), "pt-br")


def from_django_language(language: str | None, default: str = "pt") -> str:
    """Converte código Django ativo para o código de produto."""

    code = (language or "").strip().lower().replace("_", "-")
    if code in DJANGO_TO_PRODUCT:
        return DJANGO_TO_PRODUCT[code]
    return resolve_language(code, default)


def activate_language(language: str | None) -> str:
    """Ativa o gettext Django para o idioma de produto; devolve o código Django."""

    django_language = to_django_language(language or "pt")
    translation.activate(django_language)
    return django_language


def localized_text(item: Any, field: str, language: str) -> str:
    """Lê ``field_<lang>`` quando preenchido; caso contrário devolve o campo base (PT)."""

    if language in {"en", "es"}:
        value = getattr(item, f"{field}_{language}", None) or ""
        if str(value).strip():
            return value
    return getattr(item, field, "") or ""
