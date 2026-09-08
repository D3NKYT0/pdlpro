import pytest
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.wallet.infrastructure.bonus import DjangoPurchaseBonusPolicy
from apps.wallet.infrastructure.models import CoinPurchaseBonus, CoinPurchasePromo

User = get_user_model()


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def player(db):
    return User.objects.create_user(username="payer", email="payer@pdl.dev", password="Secret123")


@pytest.mark.django_db
def test_create_and_confirm_payment_credits_wallet_and_bonus(api, player):
    CoinPurchaseBonus.objects.create(
        min_amount=Decimal("10.00"),
        percent=Decimal("10.00"),
        description="Bônus 10%",
        active=True,
    )
    api.force_authenticate(user=player)
    created = api.post("/api/v1/customer/payments/", {"amount": "50.00", "method": "mock"}, format="json")
    assert created.status_code == 200, created.data
    order_id = created.data["id"]
    confirmed = api.post(f"/api/v1/customer/payments/{order_id}/confirm/", format="json")
    assert confirmed.status_code == 200, confirmed.data
    assert confirmed.data["status"] == "confirmed"
    assert confirmed.data["bonus_applied"] == "5.00"
    wallet = api.get("/api/v1/shared/wallet/")
    assert wallet.status_code == 200
    assert wallet.data["balance"] == "50.00"
    assert wallet.data["bonus_balance"] == "5.00"


@pytest.mark.django_db
def test_payment_catalog_and_package_credits_coins(api, player):
    from apps.wallet.infrastructure.models import CoinPackage

    pack = CoinPackage.objects.create(
        code="test_plus",
        name="Plus",
        coins=Decimal("120.00"),
        price_brl=Decimal("100.00"),
        price_usd=Decimal("18.90"),
        active=True,
    )
    api.force_authenticate(user=player)
    catalog = api.get("/api/v1/customer/payments/catalog/")
    assert catalog.status_code == 200
    assert catalog.data["promo"] is None
    assert any(row["code"] == "test_plus" for row in catalog.data["packages"])
    assert any(method["id"] == "mock" for method in catalog.data["methods"])
    created = api.post(
        "/api/v1/customer/payments/",
        {"package_id": str(pack.id), "currency": "BRL", "method": "mock"},
        format="json",
    )
    assert created.status_code == 200, created.data
    assert created.data["coins"] == "120.00"
    assert created.data["amount"] == "100.00"
    confirmed = api.post(f"/api/v1/customer/payments/{created.data['id']}/confirm/")
    assert confirmed.status_code == 200
    wallet = api.get("/api/v1/shared/wallet/")
    assert wallet.data["balance"] == "120.00"


@pytest.mark.django_db
def test_payment_catalog_exposes_active_promo(api, player):
    CoinPurchasePromo.objects.create(
        percent=Decimal("15.00"),
        title="Recarga em promoção",
        description="15% a mais de moedas",
        active=True,
    )
    api.force_authenticate(user=player)
    catalog = api.get("/api/v1/customer/payments/catalog/")
    assert catalog.status_code == 200
    assert catalog.data["promo"] == {
        "percent": "15.00",
        "title": "Recarga em promoção",
        "description": "15% a mais de moedas",
    }


@pytest.mark.django_db
def test_payment_catalog_hides_expired_promo(api, player):
    CoinPurchasePromo.objects.create(
        percent=Decimal("15.00"),
        title="Expirada",
        description="Já passou",
        active=True,
        ends_at=timezone.now() - timedelta(hours=1),
    )
    api.force_authenticate(user=player)
    catalog = api.get("/api/v1/customer/payments/catalog/")
    assert catalog.status_code == 200
    assert catalog.data["promo"] is None


@pytest.mark.django_db
def test_confirm_payment_applies_promo_bonus_without_tier(api, player):
    CoinPurchasePromo.objects.create(
        percent=Decimal("20.00"),
        title="Campanha 20%",
        description="Bônus promo 20%",
        active=True,
    )
    api.force_authenticate(user=player)
    created = api.post("/api/v1/customer/payments/", {"amount": "50.00", "method": "mock"}, format="json")
    assert created.status_code == 200, created.data
    confirmed = api.post(f"/api/v1/customer/payments/{created.data['id']}/confirm/", format="json")
    assert confirmed.status_code == 200, confirmed.data
    assert confirmed.data["bonus_applied"] == "10.00"
    wallet = api.get("/api/v1/shared/wallet/")
    assert wallet.data["balance"] == "50.00"
    assert wallet.data["bonus_balance"] == "10.00"


@pytest.mark.django_db
def test_bonus_policy_uses_max_of_tier_and_promo():
    CoinPurchaseBonus.objects.create(
        min_amount=Decimal("10.00"),
        percent=Decimal("10.00"),
        description="Faixa 10%",
        active=True,
    )
    CoinPurchasePromo.objects.create(
        percent=Decimal("25.00"),
        title="Campanha",
        description="Promo 25%",
        active=True,
    )
    preview = DjangoPurchaseBonusPolicy().preview(Decimal("50.00"))
    assert preview.percent == Decimal("25.00")
    assert preview.bonus == Decimal("12.50")
    assert preview.description == "Promo 25%"

    CoinPurchasePromo.objects.all().update(active=False)
    CoinPurchasePromo.objects.create(
        percent=Decimal("10.00"),
        title="Campanha menor",
        description="Promo 10%",
        active=True,
    )
    CoinPurchaseBonus.objects.all().delete()
    CoinPurchaseBonus.objects.create(
        min_amount=Decimal("10.00"),
        percent=Decimal("30.00"),
        description="Faixa 30%",
        active=True,
    )
    preview = DjangoPurchaseBonusPolicy().preview(Decimal("50.00"))
    assert preview.percent == Decimal("30.00")
    assert preview.bonus == Decimal("15.00")
    assert preview.description == "Faixa 30%"


@pytest.mark.django_db
def test_usd_custom_amount_converts_to_coins(api, player):
    api.force_authenticate(user=player)
    created = api.post(
        "/api/v1/customer/payments/",
        {"amount": "10.00", "currency": "USD", "method": "mock"},
        format="json",
    )
    assert created.status_code == 200, created.data
    assert created.data["currency"] == "USD"
    assert created.data["coins"] == "50.00"
    confirmed = api.post(f"/api/v1/customer/payments/{created.data['id']}/confirm/")
    assert confirmed.status_code == 200
    wallet = api.get("/api/v1/shared/wallet/")
    assert wallet.data["balance"] == "50.00"


@pytest.mark.django_db
def test_payment_orders_list_is_paginated(api, player):
    from apps.payment.infrastructure.models import PedidoPagamento

    for index in range(3):
        PedidoPagamento.objects.create(
            user=player,
            amount=Decimal("10.00") + index,
            coins=Decimal("10.00") + index,
            currency="BRL",
            method="mock",
            status="pending",
        )
    api.force_authenticate(user=player)
    response = api.get("/api/v1/customer/payments/", {"page_size": 2})
    assert response.status_code == 200
    assert response.data["count"] == 3
    assert response.data["total_pages"] == 2
    assert len(response.data["results"]) == 2
    assert "created_at" in response.data["results"][0]
    page_two = api.get("/api/v1/customer/payments/", {"page": 2, "page_size": 2})
    assert page_two.status_code == 200
    assert len(page_two.data["results"]) == 1


@pytest.mark.django_db
def test_real_methods_cannot_be_confirmed_manually(api, player):
    from apps.payment.infrastructure.models import PedidoPagamento

    order = PedidoPagamento.objects.create(
        user=player,
        amount=Decimal("9.90"),
        coins=Decimal("50.00"),
        currency="USD",
        method="stripe",
        status="pending",
    )
    api.force_authenticate(user=player)
    response = api.post(f"/api/v1/customer/payments/{order.id}/confirm/")
    assert response.status_code == 400
