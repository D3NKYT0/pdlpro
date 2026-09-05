"""Rotas conhecidas do painel que o Denkynho pode citar; caminhos arbitrários são ignorados."""

from __future__ import annotations

import re

SCREENS: dict[str, dict[str, str]] = {
    "/painel": {"pt": "Painel", "en": "Dashboard"},
    "/painel/ajuda": {"pt": "Ajuda", "en": "Help"},
    "/painel/accounts": {"pt": "Contas e personagens", "en": "Accounts and characters"},
    "/painel/wallet": {"pt": "Carteira", "en": "Wallet"},
    "/painel/wallet/jogo": {"pt": "Troca para o jogo", "en": "Game exchange"},
    "/painel/inventory": {"pt": "Inventário", "en": "Inventory"},
    "/painel/shop": {"pt": "Loja", "en": "Shop"},
    "/painel/marketplace": {"pt": "Marketplace", "en": "Marketplace"},
    "/painel/auctions": {"pt": "Leilões", "en": "Auctions"},
    "/painel/games": {"pt": "Jogos", "en": "Games"},
    "/painel/recompensas": {"pt": "Jornada e recompensas", "en": "Journey and rewards"},
    "/painel/apoiadores": {"pt": "Apoiadores", "en": "Supporters"},
    "/painel/profile": {"pt": "Meu perfil", "en": "My profile"},
    "/painel/security": {"pt": "Conta e segurança", "en": "Account and security"},
    "/painel/progress": {"pt": "Progresso", "en": "Progress"},
    "/painel/notifications": {"pt": "Avisos", "en": "Notifications"},
    "/painel/support": {"pt": "Atendimento", "en": "Support"},
    "/painel/admin": {"pt": "Administração", "en": "Administration"},
}
_ACCOUNT_DETAIL = re.compile(r"^/painel/accounts/[a-zA-Z0-9_-]+/[0-9]+$")


def canonical_screen(path: str) -> str | None:
    """Devolve só um caminho do catálogo; URLs, query strings e destinos inventados saem vazios."""

    if not path or not path.startswith("/painel") or "://" in path or "?" in path or "#" in path:
        return None
    if _ACCOUNT_DETAIL.fullmatch(path):
        path = "/painel/accounts"
    elif path.startswith("/painel/admin"):
        path = "/painel/admin"
    return path if path in SCREENS else None


def describe_screen(path: str, language: str) -> dict[str, str] | None:
    """Título autorizado da tela atual para o prompt; None quando o caminho não é confiável."""

    canonical = canonical_screen(path)
    if not canonical:
        return None
    titles = SCREENS[canonical]
    return {"path": canonical, "title": titles["en"] if language == "en" else titles["pt"]}
