"""Contratos HTTP do catálogo granular e isolamento entre operações vizinhas."""

from importlib import import_module
from unittest.mock import Mock

import pytest
from django.urls import resolve
from rest_framework.test import APIClient

from apps.programs.domain.resources import resource_ancestors
from apps.programs.models import SystemResource

pytestmark = pytest.mark.django_db

OPERATIONS = [
    ("shop-checkout", "shared/shop/checkout/", "POST", ""),
    ("shop-packages", "shared/shop/commerce/packages/", "GET", ""),
    ("shop-history", "shared/shop/commerce/purchases/", "GET", ""),
    ("wallet-purchase", "customer/payments/", "POST", ""),
    ("wallet-transfer", "shared/wallet/transfer/", "POST", ""),
    ("wallet-game-exchange", "shared/wallet/game-exchange/", "GET", ""),
    ("wallet-history", "shared/wallet/transactions/", "GET", ""),
    ("inventory-withdraw", "customer/inventory/withdraw/", "POST", ""),
    ("inventory-deposit", "customer/inventory/deposit/", "POST", ""),
    ("inventory-trade", "customer/inventory/trade/", "POST", ""),
    ("inventory-bag-transfer", "customer/games/bag/", "POST", ""),
    ("marketplace-sell", "customer/marketplace/", "POST", ""),
    (
        "marketplace-buy",
        "customer/marketplace/12345678-1234-1234-1234-123456789012/buy/",
        "POST",
        "",
    ),
    ("auction-create", "customer/auctions/", "POST", ""),
    (
        "auction-bid",
        "customer/auctions/12345678-1234-1234-1234-123456789012/bid/",
        "POST",
        "",
    ),
    ("games-roulette", "customer/games/roulette/", "GET", ""),
    ("games-boxes", "customer/games/boxes/", "GET", ""),
    ("games-boxes-buy", "customer/games/boxes/", "POST", ""),
    (
        "games-boxes-open",
        "customer/games/boxes/12345678-1234-1234-1234-123456789012/open/",
        "POST",
        "",
    ),
    ("games-dice", "customer/games/dice/", "GET", ""),
    ("games-slots", "customer/games/slots/", "GET", ""),
    ("games-economy", "customer/games/economy/", "GET", ""),
    (
        "games-fight",
        "customer/games/economy/12345678-1234-1234-1234-123456789012/fight/",
        "POST",
        "",
    ),
    ("games-enchant", "customer/games/economy/enchant/", "POST", ""),
    ("games-buy-tokens", "customer/games/tokens/", "POST", ""),
    (
        "games-statistics",
        "customer/games/statistics/12345678-1234-1234-1234-123456789012/",
        "GET",
        "",
    ),
    ("battle-pass-premium", "customer/games/battle-pass/", "POST", ""),
    (
        "battle-pass-claim",
        "customer/games/battle-pass/12345678-1234-1234-1234-123456789012/claim/",
        "POST",
        "",
    ),
    ("battle-pass-quests", "customer/games/battle-pass/details/", "POST", "quest"),
    (
        "battle-pass-exchanges",
        "customer/games/battle-pass/details/",
        "POST",
        "exchange",
    ),
    (
        "battle-pass-milestones",
        "customer/games/battle-pass/details/",
        "POST",
        "milestone",
    ),
    (
        "battle-pass-auto-claim",
        "customer/games/battle-pass/details/",
        "POST",
        "auto-claim",
    ),
    ("daily-bonus-claim", "customer/games/daily-bonus/", "POST", ""),
    ("fishing-cast", "customer/games/fishing/", "POST", ""),
    ("fishing-buy-bait", "customer/games/fishing/details/", "POST", ""),
    ("hunt-claim", "customer/games/hunt/", "POST", ""),
    ("accounts-register", "customer/server/accounts/register/", "POST", ""),
    ("accounts-link-credentials", "customer/server/accounts/link/", "POST", ""),
    ("accounts-link-email", "customer/server/accounts/link-email/", "POST", ""),
    ("accounts-buy-slots", "customer/server/accounts/slots/", "POST", ""),
    ("accounts-password", "customer/server/accounts/password/", "POST", ""),
    ("accounts-unlink", "customer/server/accounts/unlink/", "POST", ""),
    ("accounts-nickname", "customer/server/characters/nickname/", "POST", ""),
    ("accounts-sex", "customer/server/characters/sex/", "POST", ""),
    ("accounts-unstuck", "customer/server/characters/unstuck/", "POST", ""),
    ("accounts-teleport", "customer/server/characters/teleport/", "POST", ""),
    ("accounts-appearance", "customer/server/characters/appearance/", "POST", ""),
    ("accounts-clear-karma", "customer/server/characters/karma/", "POST", ""),
    ("accounts-clear-pk", "customer/server/characters/pk/", "POST", ""),
    ("accounts-skills", "customer/server/characters/123/skills/", "GET", ""),
    ("profile-edit", "shared/me/", "PATCH", ""),
    (
        "progress-claim-rewards",
        "shared/me/rewards/12345678-1234-1234-1234-123456789012/claim/",
        "POST",
        "",
    ),
    ("supporters-apply", "customer/supporters/", "POST", ""),
    ("supporters-payout", "customer/supporters/payout/", "POST", ""),
    ("notifications-push", "customer/push/vapid/", "GET", ""),
    ("support-create", "customer/support/", "POST", ""),
    (
        "support-reply",
        "customer/support/12345678-1234-1234-1234-123456789012/",
        "POST",
        "",
    ),
    (
        "support-status",
        "customer/support/12345678-1234-1234-1234-123456789012/",
        "PATCH",
        "",
    ),
    ("help-chat", "shared/content/assistant/reply/", "POST", ""),
    ("help-pet", "shared/content/assistant/pet/", "GET", ""),
    ("help-wardrobe", "shared/content/assistant/pet/wardrobe/", "GET", ""),
    ("news-detail", "public/news/12345678-1234-1234-1234-123456789012/", "GET", ""),
    ("wiki-detail", "public/wiki/12345678-1234-1234-1234-123456789012/", "GET", ""),
    ("faq-panel", "shared/content/faq/", "GET", ""),
    (
        "roadmap-detail",
        "public/roadmap/12345678-1234-1234-1234-123456789012/",
        "GET",
        "",
    ),
    ("rankings-pvp", "public/server/rankings/pvp/", "GET", ""),
    ("rankings-pk", "public/server/rankings/pk/", "GET", ""),
    ("rankings-adena", "public/server/rankings/adena/", "GET", ""),
    ("rankings-clans", "public/server/rankings/clans/", "GET", ""),
    ("rankings-level", "public/server/rankings/level/", "GET", ""),
    ("rankings-online", "public/server/rankings/online/", "GET", ""),
    ("rankings-olympiad", "public/server/world/olympiad_ranking/", "GET", ""),
    ("rankings-grandboss", "public/server/world/grandboss_status/", "GET", ""),
    ("rankings-siege", "public/server/world/siege/", "GET", ""),
    ("rankings-search", "public/server/world/search_characters/", "GET", ""),
]


@pytest.mark.parametrize("code,path,method,action", OPERATIONS)
def test_disabled_operation_is_rejected_before_any_side_effect(
    code, path, method, action
):
    url = "/api/v1/" + path
    resolve(url)
    row = SystemResource.objects.get(code=code)
    row.enabled = False
    row.save(update_fields=["enabled"])
    client = APIClient()
    # Resource gating precedes serializers, providers and external integrations.
    response = getattr(client, method.lower())(url, {"action": action}, format="json")
    assert response.status_code == 403
    assert response.json()["error_code"] == "RESOURCE_DISABLED"


@pytest.mark.parametrize(
    "code,path",
    [
        ("wallet-purchase", "customer/payments/"),
        ("wallet-transfer", "shared/wallet/"),
        ("inventory-bag-transfer", "customer/games/bag/"),
        ("accounts-register", "customer/server/accounts/"),
        ("support-create", "customer/support/"),
        ("profile-edit", "shared/me/"),
        ("notifications-push", "customer/notifications/"),
        ("shop-checkout", "shared/shop/cart/"),
        ("news-detail", "public/news/"),
        ("rankings-pvp", "public/server/rankings/pk/"),
    ],
)
def test_disabled_action_does_not_disable_listing_or_sibling(code, path):
    SystemResource.objects.filter(code=code).update(enabled=False)
    response = APIClient().get("/api/v1/" + path)
    assert (
        response.json().get("error_code") != "RESOURCE_DISABLED"
        if isinstance(response.json(), dict)
        else True
    )


@pytest.mark.parametrize("encoding", ["json", "multipart"])
def test_shared_endpoint_checks_only_requested_battle_action(encoding):
    SystemResource.objects.filter(code="battle-pass-quests").update(enabled=False)
    client = APIClient()
    url = "/api/v1/customer/games/battle-pass/details/"
    blocked = client.post(url, {"action": "quest"}, format=encoding)
    assert blocked.status_code == 403
    assert blocked.json()["error_code"] == "RESOURCE_DISABLED"
    sibling = client.post(url, {"action": "exchange"}, format=encoding)
    assert sibling.json().get("error_code") != "RESOURCE_DISABLED"
    invalid = client.post(url, {"action": "invalid"}, format=encoding)
    assert invalid.json().get("error_code") != "RESOURCE_DISABLED"


def test_nested_parent_blocks_child_without_changing_preferences():
    SystemResource.objects.filter(code="games-boxes").update(enabled=False)
    response = APIClient().post(
        "/api/v1/customer/games/boxes/12345678-1234-1234-1234-123456789012/open/", {}
    )
    assert response.status_code == 403
    assert SystemResource.objects.get(code="games-boxes-open").enabled
    assert resource_ancestors("games-boxes-open") == [
        "games-boxes-open",
        "games-boxes",
        "games",
    ]


@pytest.mark.parametrize(
    "language,expected", [("en", "Buy tokens"), ("es", "Comprar fichas")]
)
def test_catalog_translates_new_labels_and_exports_hierarchy(language, expected):
    response = APIClient().get(
        "/api/v1/public/resources/", HTTP_ACCEPT_LANGUAGE=language
    )
    rows = {row["code"]: row for row in response.json()}
    assert rows["games-boxes-open"]["parent_code"] == "games-boxes"
    assert rows["games-buy-tokens"]["name"] == expected
    assert len([row for row in rows.values() if row["parent_code"]]) >= 78


def test_catalog_migration_preserves_preexisting_admin_choice():
    row = SystemResource.objects.get(code="shop-checkout")
    row.enabled = False
    row.save(update_fields=["enabled"])
    migration = import_module("apps.programs.migrations.0009_expand_micro_resources")
    from django.apps import apps

    migration.forwards(apps, Mock())
    row.refresh_from_db()
    assert not row.enabled


@pytest.mark.parametrize("body", [b"{", b"[]", b"null", b"\xff"])
def test_invalid_shared_action_payload_remains_serializer_error(body):
    from django.contrib.auth import get_user_model

    client = APIClient()
    client.force_authenticate(
        get_user_model().objects.create_user(username="invalid_body", email="invalid-body@local.test")
    )
    SystemResource.objects.filter(code="battle-pass-quests").update(enabled=False)
    response = client.generic(
        "POST",
        "/api/v1/customer/games/battle-pass/details/",
        body,
        content_type="application/json",
    )
    assert response.status_code == 400
    assert response.json().get("error_code") != "RESOURCE_DISABLED"


def test_head_is_gated_but_push_unsubscribe_remains_available():
    SystemResource.objects.filter(
        code__in=["news-detail", "notifications-push"]
    ).update(enabled=False)
    client = APIClient()
    assert client.head("/api/v1/public/news/sample/").status_code == 403
    response = client.delete("/api/v1/customer/push/subscribe/")
    assert response.json().get("error_code") != "RESOURCE_DISABLED"


def test_middleware_resolves_repository_without_request_scope():
    from django.http import HttpResponse
    from django.test import RequestFactory

    from apps.programs.middleware import ResourceGateMiddleware

    SystemResource.objects.filter(code="wallet-transfer").update(enabled=False)
    response = ResourceGateMiddleware(lambda request: HttpResponse(status=204))(
        RequestFactory().post("/api/v1/shared/wallet/transfer/", {})
    )
    assert response.status_code == 403


def test_invalid_catalog_cycle_is_rejected(monkeypatch):
    from apps.programs.domain.resources import RESOURCE_PARENTS

    monkeypatch.setitem(RESOURCE_PARENTS, "cycle-a", "cycle-b")
    monkeypatch.setitem(RESOURCE_PARENTS, "cycle-b", "cycle-a")
    with pytest.raises(ValueError, match="Ciclo"):
        resource_ancestors("cycle-a")
