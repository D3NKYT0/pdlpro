from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.payment.infrastructure.models import PedidoPagamento
from apps.wallet.infrastructure.models import Wallet, WalletTransaction

pytestmark = pytest.mark.django_db
CONFIRM = "/api/v1/staff/payments/{}/confirm-mock/"


def user(name, **kwargs):
    return get_user_model().objects.create_user(username=name, email=f"{name}@pdl.test", **kwargs)


@pytest.fixture
def player():
    return user("payer")


@pytest.fixture
def order(player):
    return PedidoPagamento.objects.create(
        user=player,
        amount=Decimal("30.00"),
        coins=Decimal("30.00"),
        currency="BRL",
        method="mock",
        status="pending",
    )


@pytest.fixture
def staff_client():
    client = APIClient()
    client.force_authenticate(user("gm", is_staff=True))
    return client


def test_staff_confirm_mock_credits_another_user_wallet(staff_client, order, player):
    response = staff_client.post(CONFIRM.format(order.id))
    assert response.status_code == 200, response.data
    assert response.data["status"] == "confirmed"
    assert response.data["coins"] == "30.00"
    order.refresh_from_db()
    assert order.status == "confirmed"
    wallet = Wallet.objects.get(user=player)
    assert wallet.balance == Decimal("30.00")
    assert WalletTransaction.objects.filter(wallet=wallet, kind="ENTRADA").count() == 1


def test_staff_confirm_mock_is_idempotent(staff_client, order, player):
    first = staff_client.post(CONFIRM.format(order.id))
    second = staff_client.post(CONFIRM.format(order.id))
    assert first.status_code == 200
    assert second.status_code == 200
    assert Wallet.objects.get(user=player).balance == Decimal("30.00")
    assert WalletTransaction.objects.filter(wallet__user=player, kind="ENTRADA").count() == 1


def test_staff_cannot_confirm_real_payment_method(staff_client, player):
    order = PedidoPagamento.objects.create(
        user=player,
        amount=Decimal("9.90"),
        coins=Decimal("50.00"),
        currency="USD",
        method="stripe",
        status="pending",
    )
    response = staff_client.post(CONFIRM.format(order.id))
    assert response.status_code == 400, response.data
    order.refresh_from_db()
    assert order.status == "pending"
    assert not WalletTransaction.objects.exists()


def test_player_cannot_use_staff_confirm(order):
    client = APIClient()
    client.force_authenticate(order.user)
    response = client.post(CONFIRM.format(order.id))
    assert response.status_code == 403
    order.refresh_from_db()
    assert order.status == "pending"
    assert not WalletTransaction.objects.exists()


def test_anonymous_cannot_use_staff_confirm(order):
    response = APIClient().post(CONFIRM.format(order.id))
    assert response.status_code in (401, 403)
    order.refresh_from_db()
    assert order.status == "pending"
