"""Localiza nomes de iscas e peixes com o idioma ativo da requisição."""

from __future__ import annotations

from common.i18n import active_product_language, localized_text


def fishing_language() -> str:
    return active_product_language()


def localized_bait_name(bait, language: str | None = None) -> str:
    return localized_text(bait, "name", language or fishing_language())


def localized_bait_description(bait, language: str | None = None) -> str:
    return localized_text(bait, "description", language or fishing_language())


def localized_fish_name(fish, language: str | None = None) -> str:
    if fish is None:
        return ""
    return localized_text(fish, "name", language or fishing_language())
