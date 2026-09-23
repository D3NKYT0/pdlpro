from __future__ import annotations

import re
from typing import Any

from django.utils.translation import gettext as _

from common.architecture.exceptions import ValidationDomainError

HTTPS_URL_RE = re.compile(r"^https://[^\s]+$")
YOUTUBE_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")


def first_text(*values: Any) -> str:
    """Devolve o primeiro texto não vazio; usado no merge env → tema → admin."""

    for value in values:
        text = str(value or "").strip()
        if text:
            return text
    return ""


def overlay_map(*maps: Any) -> dict[str, str]:
    """Copia chaves com valor não vazio; o último mapa ganha."""

    result: dict[str, str] = {}
    for mapping in maps:
        if not isinstance(mapping, dict):
            continue
        for key, value in mapping.items():
            text = str(value or "").strip()
            if text:
                result[str(key)] = text
    return result


def overlay_list(*lists: Any) -> list[str]:
    """Devolve a última lista não vazia de textos."""

    chosen: list[str] = []
    for value in lists:
        if not isinstance(value, list):
            continue
        items = [str(item).strip() for item in value if str(item).strip()]
        if items:
            chosen = items
    return chosen


def optional_https_url(value: Any, field: str = "") -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    if len(text) > 300 or not HTTPS_URL_RE.fullmatch(text):
        label = {
            "discord_url": _("A URL do Discord precisa ser HTTPS."),
            "whatsapp_url": _("A URL do WhatsApp precisa ser HTTPS."),
            "facebook_url": _("A URL do Facebook precisa ser HTTPS."),
            "instagram_url": _("A URL do Instagram precisa ser HTTPS."),
            "youtube_url": _("A URL do YouTube precisa ser HTTPS."),
        }.get(field, _("A URL precisa ser HTTPS."))
        raise ValidationDomainError(label)
    return text

def optional_youtube_id(value: Any, _field: str = "") -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    if not YOUTUBE_ID_RE.fullmatch(text):
        raise ValidationDomainError(_("O trailer precisa ser o identificador de 11 caracteres do YouTube."))
    return text
