"""Rotas conhecidas do painel que o Denkynho pode citar; caminhos arbitrários são ignorados."""

from __future__ import annotations

import re

SCREENS: dict[str, dict[str, str]] = {
    "/panel": {"pt": "Painel", "en": "Dashboard", "es": "Panel"},
    "/panel/help": {"pt": "Ajuda", "en": "Help", "es": "Ayuda"},
    "/panel/accounts": {
        "pt": "Contas e personagens",
        "en": "Accounts and characters",
        "es": "Cuentas y personajes",
    },
    "/panel/wallet": {"pt": "Carteira", "en": "Wallet", "es": "Cartera"},
    "/panel/wallet/game": {"pt": "Troca para o jogo", "en": "Game exchange", "es": "Cambio al juego"},
    "/panel/inventory": {"pt": "Inventário", "en": "Inventory", "es": "Inventario"},
    "/panel/shop": {"pt": "Loja", "en": "Shop", "es": "Tienda"},
    "/panel/marketplace": {"pt": "Marketplace", "en": "Marketplace", "es": "Marketplace"},
    "/panel/auctions": {"pt": "Leilões", "en": "Auctions", "es": "Subastas"},
    "/panel/games": {"pt": "Jogos", "en": "Games", "es": "Juegos"},
    "/panel/rewards": {
        "pt": "Jornada e recompensas",
        "en": "Journey and rewards",
        "es": "Jornada y recompensas",
    },
    "/panel/supporters": {"pt": "Apoiadores", "en": "Supporters", "es": "Patrocinadores"},
    "/panel/profile": {"pt": "Meu perfil", "en": "My profile", "es": "Mi perfil"},
    "/panel/security": {"pt": "Conta e segurança", "en": "Account and security", "es": "Cuenta y seguridad"},
    "/panel/progress": {"pt": "Progresso", "en": "Progress", "es": "Progreso"},
    "/panel/notifications": {"pt": "Avisos", "en": "Notifications", "es": "Avisos"},
    "/panel/support": {"pt": "Atendimento", "en": "Support", "es": "Atención"},
    "/panel/admin": {"pt": "Administração", "en": "Administration", "es": "Administración"},
}
_ACCOUNT_DETAIL = re.compile(r"^/panel/accounts/[a-zA-Z0-9_-]+/[0-9]+$")


def canonical_screen(path: str) -> str | None:
    """Devolve só um caminho do catálogo; URLs, query strings e destinos inventados saem vazios."""

    if not path or not path.startswith("/panel") or "://" in path or "?" in path or "#" in path:
        return None
    if _ACCOUNT_DETAIL.fullmatch(path):
        path = "/panel/accounts"
    elif path.startswith("/panel/admin"):
        path = "/panel/admin"
    return path if path in SCREENS else None


def describe_screen(path: str, language: str) -> dict[str, str] | None:
    """Título autorizado da tela atual para o prompt; None quando o caminho não é confiável."""

    canonical = canonical_screen(path)
    if not canonical:
        return None
    titles = SCREENS[canonical]
    return {"path": canonical, "title": titles.get(language) or titles["pt"]}
