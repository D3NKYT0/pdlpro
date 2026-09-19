from __future__ import annotations

import json
import re
from typing import Any

from common.architecture.exceptions import ValidationDomainError

METADATA_FILENAME = "metadados.json"
YOUTUBE_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")
HTTPS_URL_RE = re.compile(r"^https://[^\s]+$")

_SITE_KEYS = {"name", "slogan", "description", "title"}
_SEO_KEYS = {"title", "description", "ogTitle", "ogDescription", "ogImage"}
_SOCIAL_KEYS = {"discordUrl", "trailerYoutubeId"}
_SERVER_KEYS = {"chronicle", "maxLevel", "rates", "enchant", "features", "notes"}
_RATE_KEYS = {"xp", "sp", "adena", "drop", "spoil"}
_ENCHANT_KEYS = {"safe", "max"}
_NOTE_KEYS = {"pvp", "start"}
_ROOT_KEYS = {"schemaVersion", "site", "seo", "social", "server"}


def empty_theme_metadata() -> dict:
    """Contrato público vazio publicado quando o pacote não declara metadados."""

    return {
        "site": {},
        "seo": {},
        "social": {},
        "server": {},
    }


def parse_theme_metadata(raw: bytes, assets: dict) -> dict:
    """Lê e valida ``metadados.json`` do pacote; rejeita propriedades desconhecidas."""

    try:
        payload = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise ValidationDomainError("metadados.json não contém JSON UTF-8 válido.") from None
    return validate_theme_metadata(payload, assets)


def validate_theme_metadata(value: Any, assets: dict) -> dict:
    """Valida o contrato opcional de identidade pública do tema."""

    if not isinstance(value, dict):
        raise ValidationDomainError("metadados.json precisa conter um objeto JSON.")
    unknown = sorted(set(value) - _ROOT_KEYS)
    if unknown:
        raise ValidationDomainError(
            "metadados.json contém propriedades desconhecidas.",
            details={"properties": unknown},
        )
    if value.get("schemaVersion", 1) != 1:
        raise ValidationDomainError("metadados.json precisa usar schemaVersion 1.")

    site = _optional_object(value.get("site"), "site", _SITE_KEYS)
    seo = _optional_object(value.get("seo"), "seo", _SEO_KEYS)
    social = _optional_object(value.get("social"), "social", _SOCIAL_KEYS)
    server = _optional_object(value.get("server"), "server", _SERVER_KEYS)

    for key in ("name", "slogan", "title"):
        if key in site:
            site[key] = _text(site[key], f"site.{key}", 200)
    if "description" in site:
        site["description"] = _text(site["description"], "site.description", 500)

    for key in ("title", "ogTitle"):
        if key in seo:
            seo[key] = _text(seo[key], f"seo.{key}", 200)
    for key in ("description", "ogDescription"):
        if key in seo:
            seo[key] = _text(seo[key], f"seo.{key}", 500)
    if "ogImage" in seo:
        image = _text(seo["ogImage"], "seo.ogImage", 160)
        if image not in assets:
            raise ValidationDomainError(
                "seo.ogImage precisa declarar o asset em assets.",
                details={"asset": image},
            )
        seo["ogImage"] = image

    if "discordUrl" in social:
        social["discordUrl"] = _https_url(social["discordUrl"], "social.discordUrl")
    if "trailerYoutubeId" in social:
        social["trailerYoutubeId"] = _youtube_id(social["trailerYoutubeId"], "social.trailerYoutubeId")

    if "chronicle" in server:
        server["chronicle"] = _text(server["chronicle"], "server.chronicle", 80)
    if "maxLevel" in server:
        level = server["maxLevel"]
        if isinstance(level, bool) or not isinstance(level, int) or not 1 <= level <= 999:
            raise ValidationDomainError("server.maxLevel precisa ser um inteiro entre 1 e 999.")
    if "rates" in server:
        server["rates"] = _string_map(server["rates"], "server.rates", _RATE_KEYS, 20)
    if "enchant" in server:
        server["enchant"] = _string_map(server["enchant"], "server.enchant", _ENCHANT_KEYS, 20)
    if "notes" in server:
        server["notes"] = _string_map(server["notes"], "server.notes", _NOTE_KEYS, 400)
    if "features" in server:
        features = server["features"]
        if not isinstance(features, list) or len(features) > 24:
            raise ValidationDomainError("server.features precisa ser uma lista com no máximo 24 itens.")
        server["features"] = [_text(item, "server.features", 160) for item in features]

    return {"site": site, "seo": seo, "social": social, "server": server}


def flatten_theme_metadata(metadata: dict | None, assets: dict[str, str] | None = None) -> dict:
    """Converte o contrato do pacote no overlay usado pelo merge público."""

    if not metadata:
        return {}
    site = dict(metadata.get("site") or {})
    seo = dict(metadata.get("seo") or {})
    social = dict(metadata.get("social") or {})
    server = dict(metadata.get("server") or {})
    image = str(seo.get("ogImage") or "").strip()
    if image and assets and image in assets:
        image = assets[image]
    overlay: dict[str, Any] = {}
    if site.get("name"):
        overlay["name"] = site["name"]
    if site.get("slogan"):
        overlay["slogan"] = site["slogan"]
    if site.get("description"):
        overlay["description"] = site["description"]
    title = seo.get("title") or site.get("title")
    if title:
        overlay["seo_title"] = title
    if seo.get("description"):
        overlay["seo_description"] = seo["description"]
    if seo.get("ogTitle"):
        overlay["og_title"] = seo["ogTitle"]
    if seo.get("ogDescription"):
        overlay["og_description"] = seo["ogDescription"]
    if image:
        overlay["og_image"] = image
    if social.get("discordUrl"):
        overlay["discord_url"] = social["discordUrl"]
    if social.get("trailerYoutubeId"):
        overlay["trailer_youtube_id"] = social["trailerYoutubeId"]
    if server.get("chronicle"):
        overlay["chronicle"] = server["chronicle"]
    if server.get("maxLevel"):
        overlay["max_level"] = int(server["maxLevel"])
    if server.get("rates"):
        overlay["rates"] = dict(server["rates"])
    if server.get("enchant"):
        overlay["enchant"] = dict(server["enchant"])
    if server.get("features"):
        overlay["features"] = list(server["features"])
    if server.get("notes"):
        overlay["notes"] = dict(server["notes"])
    return overlay


def _optional_object(value: Any, label: str, allowed: set[str]) -> dict:
    if value is None:
        return {}
    if not isinstance(value, dict):
        raise ValidationDomainError(f"{label} precisa ser um objeto.")
    unknown = sorted(set(value) - allowed)
    if unknown:
        raise ValidationDomainError(
            f"{label} contém propriedades desconhecidas.",
            details={"properties": unknown},
        )
    return dict(value)


def _text(value: Any, label: str, limit: int) -> str:
    if not isinstance(value, str) or not value.strip() or len(value) > limit:
        raise ValidationDomainError(f"{label} contém um texto inválido.")
    return value.strip()


def _https_url(value: Any, label: str) -> str:
    url = _text(value, label, 300)
    if not HTTPS_URL_RE.fullmatch(url):
        raise ValidationDomainError(f"{label} precisa ser uma URL HTTPS.")
    return url


def _youtube_id(value: Any, label: str) -> str:
    ident = _text(value, label, 11)
    if not YOUTUBE_ID_RE.fullmatch(ident):
        raise ValidationDomainError(f"{label} precisa ser o identificador de 11 caracteres do YouTube.")
    return ident


def _string_map(value: Any, label: str, allowed: set[str], limit: int) -> dict[str, str]:
    if not isinstance(value, dict):
        raise ValidationDomainError(f"{label} precisa ser um objeto.")
    unknown = sorted(set(value) - allowed)
    if unknown:
        raise ValidationDomainError(
            f"{label} contém propriedades desconhecidas.",
            details={"properties": unknown},
        )
    return {key: _text(item, f"{label}.{key}", limit) for key, item in value.items()}
