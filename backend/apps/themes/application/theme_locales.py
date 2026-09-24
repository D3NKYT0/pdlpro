"""Validação e publicação dos catálogos i18n opcionais do pacote de tema."""

from __future__ import annotations

import json
from typing import Any

from common.architecture.exceptions import ValidationDomainError

LOCALES_DIR = "locales"
LOCALE_LANGS = ("pt", "en", "es")
LOCALE_NAMESPACES = frozenset(
    {"common", "public", "auth", "panel", "admin", "help", "personality"}
)
MAX_LOCALE_DEPTH = 8
MAX_LOCALE_STRING = 2000
MAX_LOCALE_NODES = 500


def locale_json_names() -> set[str]:
    """Caminhos JSON de idioma aceitos sob ``locales/``."""

    return {f"{LOCALES_DIR}/{lang}.json" for lang in LOCALE_LANGS}


def allowed_theme_json_names() -> set[str]:
    """JSON permitidos na raiz/pastas do ZIP de tema."""

    from apps.themes.application.theme_metadata import METADATA_FILENAME

    return {"theme.json", METADATA_FILENAME, *locale_json_names()}


def parse_theme_locale(raw: bytes, *, path: str) -> dict:
    """Lê um ``locales/<lang>.json`` e valida namespaces/valores."""

    try:
        payload = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise ValidationDomainError(
            f"{path} não contém JSON UTF-8 válido.",
            details={"file": path},
        ) from None
    return validate_theme_locale(payload, path=path)


def validate_theme_locale(value: Any, *, path: str) -> dict:
    """Valida o overlay i18n: apenas namespaces conhecidos e folhas string."""

    if not isinstance(value, dict) or not value:
        raise ValidationDomainError(
            f"{path} precisa ser um objeto JSON não vazio.",
            details={"file": path},
        )
    unknown = sorted(set(value) - LOCALE_NAMESPACES)
    if unknown:
        raise ValidationDomainError(
            f"{path} declara namespaces desconhecidos.",
            details={"file": path, "namespaces": unknown},
        )
    cleaned: dict[str, Any] = {}
    nodes = 0
    for namespace, bundle in value.items():
        cleaned[namespace], nodes = _validate_locale_node(
            bundle,
            label=f"{path}.{namespace}",
            depth=1,
            nodes=nodes,
        )
    return cleaned


def _validate_locale_node(value: Any, *, label: str, depth: int, nodes: int) -> tuple[Any, int]:
    nodes += 1
    if nodes > MAX_LOCALE_NODES:
        raise ValidationDomainError(
            f"{label} excede o limite de nós do catálogo de locale.",
            details={"limit": MAX_LOCALE_NODES},
        )
    if depth > MAX_LOCALE_DEPTH:
        raise ValidationDomainError(
            f"{label} excede a profundidade máxima do locale.",
            details={"limit": MAX_LOCALE_DEPTH},
        )
    if isinstance(value, str):
        text = value.strip()
        if not text:
            raise ValidationDomainError(f"{label} não pode ser uma string vazia.")
        if len(text) > MAX_LOCALE_STRING:
            raise ValidationDomainError(
                f"{label} excede {MAX_LOCALE_STRING} caracteres.",
            )
        return text, nodes
    if isinstance(value, list):
        items = []
        for index, item in enumerate(value):
            if not isinstance(item, str):
                raise ValidationDomainError(
                    f"{label}[{index}] precisa ser uma string.",
                )
            cleaned, nodes = _validate_locale_node(
                item, label=f"{label}[{index}]", depth=depth + 1, nodes=nodes
            )
            items.append(cleaned)
        if not items:
            raise ValidationDomainError(f"{label} não pode ser uma lista vazia.")
        return items, nodes
    if isinstance(value, dict):
        if not value:
            raise ValidationDomainError(f"{label} não pode ser um objeto vazio.")
        cleaned: dict[str, Any] = {}
        for key, child in value.items():
            if not isinstance(key, str) or not key.strip():
                raise ValidationDomainError(f"{label} possui uma chave inválida.")
            cleaned[key], nodes = _validate_locale_node(
                child, label=f"{label}.{key}", depth=depth + 1, nodes=nodes
            )
        return cleaned, nodes
    raise ValidationDomainError(
        f"{label} precisa ser string, lista de strings ou objeto.",
    )


def resolve_locale_files(manifest: dict, files: dict[str, bytes]) -> dict[str, dict]:
    """Confere o ponteiro ``locales`` e devolve bundles validados por idioma."""

    pointer = manifest.get("locales")
    present = sorted(name for name in files if name in locale_json_names())
    if pointer is None:
        if present:
            raise ValidationDomainError(
                "Arquivos em locales/ só podem entrar no pacote quando theme.json aponta locales.",
                details={"files": present},
            )
        return {}
    if not isinstance(pointer, str) or pointer != LOCALES_DIR:
        raise ValidationDomainError(
            'locales precisa apontar para a pasta "locales" na raiz do pacote.',
        )
    if not present:
        raise ValidationDomainError(
            "O manifesto aponta locales, mas nenhum locales/pt.json, en.json ou es.json foi encontrado.",
        )
    bundles: dict[str, dict] = {}
    for name in present:
        lang = name.removeprefix(f"{LOCALES_DIR}/").removesuffix(".json")
        bundles[lang] = parse_theme_locale(files[name], path=name)
    return bundles
