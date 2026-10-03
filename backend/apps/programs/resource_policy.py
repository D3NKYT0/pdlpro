"""Política HTTP dos micro-recursos: métodos, rotas e ações validadas na apresentação."""

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class ResourceRule:
    """Seleciona uma operação HTTP; ação distingue operações que compartilham endpoint."""

    code: str
    path: str
    methods: tuple[str, ...] = ()
    action: str = ""

    def matches(self, path: str, method: str, payload: dict) -> bool:
        return (
            (not self.methods or method in self.methods)
            and re.fullmatch(self.path, path) is not None
            and (not self.action or payload.get("action") == self.action)
        )


MICRO_RESOURCE_RULES = (
    ResourceRule("shop-checkout", r"shared/shop/checkout/", ("POST",), ""),
    ResourceRule("shop-packages", r"shared/shop/commerce/packages/", (), ""),
    ResourceRule("shop-history", r"shared/shop/commerce/purchases/", ("GET",), ""),
    ResourceRule("wallet-purchase", r"customer/payments/", ("POST",), ""),
    ResourceRule("wallet-transfer", r"shared/wallet/transfer/", ("POST",), ""),
    ResourceRule("wallet-game-exchange", r"shared/wallet/game-exchange/", (), ""),
    ResourceRule(
        "wallet-history",
        r"(shared/wallet/transactions/|customer/payments/)",
        ("GET",),
        "",
    ),
    ResourceRule("inventory-withdraw", r"customer/inventory/withdraw/", ("POST",), ""),
    ResourceRule("inventory-deposit", r"customer/inventory/deposit/", ("POST",), ""),
    ResourceRule("inventory-trade", r"customer/inventory/trade/", ("POST",), ""),
    ResourceRule("inventory-bag-transfer", r"customer/games/bag/", ("POST",), ""),
    ResourceRule("marketplace-sell", r"customer/marketplace/", ("POST",), ""),
    ResourceRule("marketplace-buy", r"customer/marketplace/[^/]+/buy/", ("POST",), ""),
    ResourceRule("auction-create", r"customer/auctions/", ("POST",), ""),
    ResourceRule("auction-bid", r"customer/auctions/[^/]+/bid/", ("POST",), ""),
    ResourceRule("games-roulette", r"customer/games/roulette/", (), ""),
    ResourceRule("games-boxes", r"customer/games/boxes/.*", (), ""),
    ResourceRule("games-boxes-buy", r"customer/games/boxes/", ("POST",), ""),
    ResourceRule(
        "games-boxes-open", r"customer/games/boxes/[^/]+/open/", ("POST",), ""
    ),
    ResourceRule("games-dice", r"customer/games/dice/", (), ""),
    ResourceRule("games-slots", r"customer/games/slots/", (), ""),
    ResourceRule("games-economy", r"customer/games/economy/.*", (), ""),
    ResourceRule("games-fight", r"customer/games/economy/[^/]+/fight/", ("POST",), ""),
    ResourceRule("games-enchant", r"customer/games/economy/enchant/", ("POST",), ""),
    ResourceRule("games-buy-tokens", r"customer/games/tokens/", ("POST",), ""),
    ResourceRule("games-statistics", r"customer/games/statistics/[^/]+/", ("GET",), ""),
    ResourceRule("battle-pass-premium", r"customer/games/battle-pass/", ("POST",), ""),
    ResourceRule(
        "battle-pass-claim", r"customer/games/battle-pass/[^/]+/claim/", ("POST",), ""
    ),
    ResourceRule(
        "battle-pass-quests", r"customer/games/battle-pass/details/", ("POST",), "quest"
    ),
    ResourceRule(
        "battle-pass-exchanges",
        r"customer/games/battle-pass/details/",
        ("POST",),
        "exchange",
    ),
    ResourceRule(
        "battle-pass-milestones",
        r"customer/games/battle-pass/details/",
        ("POST",),
        "milestone",
    ),
    ResourceRule(
        "battle-pass-auto-claim",
        r"customer/games/battle-pass/details/",
        ("POST",),
        "auto-claim",
    ),
    ResourceRule("daily-bonus-claim", r"customer/games/daily-bonus/", ("POST",), ""),
    ResourceRule("fishing-cast", r"customer/games/fishing/", ("POST",), ""),
    ResourceRule("fishing-buy-bait", r"customer/games/fishing/details/", ("POST",), ""),
    ResourceRule("hunt-claim", r"customer/games/hunt/", ("POST",), ""),
    ResourceRule(
        "accounts-register", r"customer/server/accounts/register/", ("POST",), ""
    ),
    ResourceRule(
        "accounts-link-credentials", r"customer/server/accounts/link/", ("POST",), ""
    ),
    ResourceRule(
        "accounts-link-email",
        r"customer/server/accounts/link-email/(confirm/)?",
        ("POST",),
        "",
    ),
    ResourceRule(
        "accounts-buy-slots", r"customer/server/accounts/slots/", ("POST",), ""
    ),
    ResourceRule(
        "accounts-password", r"customer/server/accounts/password/", ("POST",), ""
    ),
    ResourceRule("accounts-unlink", r"customer/server/accounts/unlink/", ("POST",), ""),
    ResourceRule(
        "accounts-nickname", r"customer/server/characters/nickname/", ("POST",), ""
    ),
    ResourceRule("accounts-sex", r"customer/server/characters/sex/", ("POST",), ""),
    ResourceRule(
        "accounts-unstuck", r"customer/server/characters/unstuck/", ("POST",), ""
    ),
    ResourceRule(
        "accounts-teleport", r"customer/server/characters/teleport/", ("POST",), ""
    ),
    ResourceRule(
        "accounts-appearance", r"customer/server/characters/appearance/", ("POST",), ""
    ),
    ResourceRule(
        "accounts-clear-karma", r"customer/server/characters/karma/", ("POST",), ""
    ),
    ResourceRule("accounts-clear-pk", r"customer/server/characters/pk/", ("POST",), ""),
    ResourceRule(
        "accounts-skills", r"customer/server/characters/[0-9]+/skills/", ("GET",), ""
    ),
    ResourceRule("profile-edit", r"shared/me/", ("PATCH", "PUT"), ""),
    ResourceRule(
        "progress-claim-rewards", r"shared/me/rewards/[^/]+/claim/", ("POST",), ""
    ),
    ResourceRule("supporters-apply", r"customer/supporters/", ("POST",), ""),
    ResourceRule("supporters-payout", r"customer/supporters/payout/", ("POST",), ""),
    ResourceRule(
        "notifications-push", r"customer/push/(vapid/|subscribe/)", ("GET", "POST"), ""
    ),
    ResourceRule("support-create", r"customer/support/", ("POST",), ""),
    ResourceRule("support-reply", r"customer/support/[^/]+/", ("POST",), ""),
    ResourceRule("support-status", r"customer/support/[^/]+/", ("PATCH",), ""),
    ResourceRule("help-chat", r"shared/content/assistant/reply/", ("POST",), ""),
    ResourceRule("help-pet", r"shared/content/assistant/pet/", ("GET", "POST"), ""),
    ResourceRule("help-wardrobe", r"shared/content/assistant/pet/wardrobe/", (), ""),
    ResourceRule(
        "news-detail", r"(public/news/|shared/content/news/)[^/]+/", ("GET",), ""
    ),
    ResourceRule("wiki-detail", r"public/wiki/[^/]+/", ("GET",), ""),
    ResourceRule("faq-panel", r"shared/content/faq/", ("GET",), ""),
    ResourceRule("roadmap-detail", r"public/roadmap/[^/]+/", ("GET",), ""),
    ResourceRule("rankings-pvp", r"public/server/rankings/pvp/", ("GET",), ""),
    ResourceRule("rankings-pk", r"public/server/rankings/pk/", ("GET",), ""),
    ResourceRule("rankings-adena", r"public/server/rankings/adena/", ("GET",), ""),
    ResourceRule("rankings-clans", r"public/server/rankings/clans/", ("GET",), ""),
    ResourceRule("rankings-level", r"public/server/rankings/level/", ("GET",), ""),
    ResourceRule("rankings-online", r"public/server/rankings/online/", ("GET",), ""),
    ResourceRule(
        "rankings-olympiad", r"public/server/world/olympiad_ranking/", ("GET",), ""
    ),
    ResourceRule(
        "rankings-grandboss", r"public/server/world/grandboss_status/", ("GET",), ""
    ),
    ResourceRule("rankings-siege", r"public/server/world/siege/", ("GET",), ""),
    ResourceRule(
        "rankings-search", r"public/server/world/search_characters/", ("GET",), ""
    ),
)
