"""Reexporta helpers de idioma; a implementação vive em ``common.i18n``."""

from common.i18n import (
    SUPPORTED_CONTENT_LANGUAGES,
    activate_language,
    from_django_language,
    localized_text,
    resolve_language,
    to_django_language,
)

__all__ = [
    "SUPPORTED_CONTENT_LANGUAGES",
    "activate_language",
    "from_django_language",
    "localized_text",
    "resolve_language",
    "to_django_language",
]
