import pytest
from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.wallet.infrastructure.models import CoinPurchaseBonus

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
