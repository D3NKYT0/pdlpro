"""Constantes de domínio do FAQ, sem dependência do ORM."""

from __future__ import annotations


class FaqAudience:
    """Audiência mínima autorizada a ver um artigo do FAQ."""

    PUBLIC = "public"
    STAFF = "staff"
    SUPERADMIN = "superadmin"

    ALL = (PUBLIC, STAFF, SUPERADMIN)


class FaqCategory:
    """Assuntos do FAQ alinhados às choices do modelo, sem importar o ORM."""

    GETTING_STARTED = "getting_started"
    ACCOUNT_SECURITY = "account_security"
    GAME_ACCOUNTS = "game_accounts"
    ECONOMY = "economy"
    COMMERCE = "commerce"
    GAMES_REWARDS = "games_rewards"
    COMMUNITY = "community"
    SUPPORT = "support"

    ALL = (
        GETTING_STARTED,
        ACCOUNT_SECURITY,
        GAME_ACCOUNTS,
        ECONOMY,
        COMMERCE,
        GAMES_REWARDS,
        COMMUNITY,
        SUPPORT,
    )
