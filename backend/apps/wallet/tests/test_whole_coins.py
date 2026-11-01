"""Moedas do site são unidades inteiras: cálculo, entrada, saldo e migração dos dados antigos."""
from decimal import Decimal
from importlib import import_module
from types import SimpleNamespace

import pytest
from django.apps import apps as django_apps
from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework.test import APIClient

from apps.games.application.rewards import (
    InvalidRewardError,
    grant_rewards,
    validate_rewards,
)
from apps.payment.application.pricing import CoinPricingService
from apps.payment.infrastructure.models import PedidoPagamento
from apps.shop.application.commerce import quote
from apps.shop.infrastructure.models import ShopItem
from apps.wallet.domain.coins import (
    ceil_coins,
    floor_coins,
    is_whole_coins,
    require_whole_coins,
)
from apps.wallet.domain.repositories import IWalletRepository
from apps.wallet.infrastructure.models import (
    CoinPackage,
    Wallet,
    WalletChargeCurrency,
    WalletTransaction,
)
from apps.wallet.presentation.fields import WholeCoinsField
from common.architecture.exceptions import ValidationDomainError
from common.di import DependencyInjection

pytestmark = pytest.mark.django_db
User = get_user_model()


@pytest.fixture
def owner():
    return User.objects.create_user(username="owner", email="owner@pdl.dev", password="Secret123")


@pytest.fixture
def wallet(owner):
    return Wallet.objects.create(user=owner, balance=Decimal(100), bonus_balance=Decimal(10))


def _repo():
    return DependencyInjection.root().create_scope().resolve(IWalletRepository)


@pytest.mark.parametrize(
    "value,down,up",
    [("101.07", "101.00", "102.00"), ("2500.00", "2500.00", "2500.00"), ("0.99", "0.00", "1.00"), (7, "7.00", "7.00")],
)
def test_rounding_keeps_the_two_place_api_format(value, down, up):
    assert str(floor_coins(value)) == down
    assert str(ceil_coins(value)) == up


@pytest.mark.parametrize("value,expected", [("10", True), ("10.00", True), ("10.01", False), ("NaN", False), ("Infinity", False)])
def test_is_whole_coins(value, expected):
    assert is_whole_coins(value) is expected


def test_require_whole_coins_refuses_fractions():
    assert require_whole_coins(Decimal("5.00")) == Decimal(5)
    with pytest.raises(ValidationDomainError):
        require_whole_coins(Decimal("5.50"))


def test_field_accepts_whole_values_and_refuses_fractions():
    field = WholeCoinsField(max_digits=12, decimal_places=2)
    assert field.to_internal_value("2500") == Decimal(2500)
    with pytest.raises(serializers.ValidationError):
        field.to_internal_value("2500.50")


def test_credit_rounds_down_and_the_ledger_matches_the_balance(wallet):
    entity = _repo().credit(wallet.id, Decimal("10.99"), origin="test", description="x")
    assert entity.balance == Decimal(110)
    assert WalletTransaction.objects.get(wallet=wallet).amount == Decimal(10)


def test_credit_bonus_rounds_down(wallet):
    assert _repo().credit_bonus(wallet.id, Decimal("2.50"), origin="test", description="x").bonus_balance == Decimal(12)


@pytest.mark.parametrize("method", ["credit", "credit_bonus"])
def test_credit_below_one_coin_changes_nothing(wallet, method):
    entity = getattr(_repo(), method)(wallet.id, Decimal("0.99"), origin="test", description="x")
    assert (entity.balance, entity.bonus_balance) == (Decimal(100), Decimal(10))
    assert not WalletTransaction.objects.exists()


def test_debit_rounds_up_so_a_price_never_gets_cheaper(wallet):
    assert _repo().debit(wallet.id, Decimal("0.50"), destination="test", description="x").balance == Decimal(99)
    assert _repo().debit_bonus(wallet.id, Decimal("0.50"), destination="test", description="x").bonus_balance == Decimal(9)


def test_transfer_api_refuses_fractional_amount_without_moving_balance(owner, wallet):
    User.objects.create_user(username="recipient", email="recipient@pdl.dev", password="Secret123")
    client = APIClient()
    client.force_authenticate(owner)
    response = client.post("/api/v1/shared/wallet/transfer/", {"recipient_username": "recipient", "amount": "12.34"}, format="json")
    assert response.status_code == 400, response.data
    wallet.refresh_from_db()
    assert wallet.balance == Decimal(100)
    assert not WalletTransaction.objects.exists()


def _pricing():
    return DependencyInjection.root().create_scope().resolve(CoinPricingService)


def test_custom_purchase_buys_only_whole_coins_and_keeps_the_money_amount():
    WalletChargeCurrency.objects.update_or_create(code="BRL", defaults={"coins_per_unit": Decimal("2.50"), "enabled": True})
    result = _pricing().quote(package_id=None, amount=Decimal("10.01"), currency="BRL")
    assert result.coins == Decimal(25)
    assert result.amount == Decimal("10.01")


def test_custom_purchase_below_one_coin_is_refused():
    WalletChargeCurrency.objects.update_or_create(code="BRL", defaults={"coins_per_unit": Decimal("1.00"), "enabled": True})
    with pytest.raises(ValidationDomainError):
        _pricing().quote(package_id=None, amount=Decimal("0.50"), currency="BRL")


def test_coupon_discount_leaves_a_whole_total():
    carts = SimpleNamespace(
        list_checkout_lines=lambda cart: [{"kind": "item", "active": True, "unit_price": Decimal(10), "quantity": 1, "id": "1", "name": "A", "item_id": 57, "item_quantity": 1}]
    )
    promo = SimpleNamespace(percent=Decimal(15), starts_at=None, ends_at=None, max_uses=0, uses=0, supporter_id=None)
    shop = SimpleNamespace(find_active_promo_by_code=lambda code, lock=False: promo)
    cart = SimpleNamespace(promo_code="OFF", use_bonus=True)
    details, _ = quote(cart, SimpleNamespace(pk=1), shop=shop, carts=carts, wallet=SimpleNamespace(bonus_balance=Decimal("2.50")))
    assert details["discount"] == "1.00"
    assert details["total"] == "9.00"
    assert details["bonus_used"] == "2.00"
    assert details["balance_due"] == "7.00"


@pytest.mark.parametrize("kind", ["balance", "bonus"])
def test_staff_cannot_configure_fractional_coin_reward(kind):
    with pytest.raises(InvalidRewardError):
        validate_rewards([{"kind": kind, "quantity": "1.50"}])
    assert validate_rewards([{"kind": kind, "quantity": "2"}]) == [{"kind": kind, "quantity": "2.00"}]


def test_old_fractional_reward_grants_only_whole_coins(owner, wallet):
    granted = grant_rewards(
        owner,
        [{"kind": "balance", "quantity": "1.50"}, {"kind": "bonus", "quantity": "0.50"}],
        "Antiga",
        wallets=_repo(),
        bags=None,
    )
    assert granted == [{"kind": "balance", "quantity": "1.00"}]
    wallet.refresh_from_db()
    assert (wallet.balance, wallet.bonus_balance) == (Decimal(101), Decimal(10))


def _migration():
    return import_module("apps.wallet.migrations.0010_whole_coins")


def test_migration_rounds_balances_down_and_keeps_the_ledger_reconciled(owner):
    wallet = Wallet.objects.create(user=owner, balance=Decimal("101.07"), bonus_balance=Decimal("3.99"))
    WalletTransaction.objects.create(wallet=wallet, kind="ENTRADA", amount=Decimal("105.06"), origin="test", description="x")
    other = User.objects.create_user(username="whole", email="whole@pdl.dev", password="Secret123")
    untouched = Wallet.objects.create(user=other, balance=Decimal(50), bonus_balance=Decimal(0))

    _migration().round_balances_down(django_apps)

    wallet.refresh_from_db()
    assert (wallet.balance, wallet.bonus_balance) == (Decimal(101), Decimal(3))
    adjustments = WalletTransaction.objects.filter(wallet=wallet, destination="coin_rounding")
    assert sorted(row.amount for row in adjustments) == [Decimal("0.07"), Decimal("0.99")]
    assert all(row.kind == "SAIDA" for row in adjustments)
    credits = sum(row.amount for row in WalletTransaction.objects.filter(wallet=wallet, kind="ENTRADA"))
    debits = sum(row.amount for row in adjustments)
    assert wallet.balance + wallet.bonus_balance == credits - debits
    assert not WalletTransaction.objects.filter(wallet=untouched).exists()


def test_migration_raises_prices_lowers_deliveries_and_preserves_history(owner):
    item = ShopItem.objects.create(name="A", item_id=57, price=Decimal("0.50"))
    package = CoinPackage.objects.create(code="p", name="P", coins=Decimal("100.50"), price_brl=Decimal("9.90"), price_usd=Decimal("1.99"))
    pending = PedidoPagamento.objects.create(user=owner, amount=Decimal("10.01"), coins=Decimal("25.02"), currency="BRL", method="stripe", status="pending")
    confirmed = PedidoPagamento.objects.create(user=owner, amount=Decimal("10.01"), coins=Decimal("25.02"), currency="BRL", method="stripe", status="confirmed")

    _migration().round_catalog(django_apps)

    item.refresh_from_db()
    package.refresh_from_db()
    pending.refresh_from_db()
    confirmed.refresh_from_db()
    assert item.price == Decimal(1)
    assert package.coins == Decimal(100)
    assert package.price_brl == Decimal("9.90")
    assert pending.coins == Decimal(25)
    assert pending.amount == Decimal("10.01")
    assert confirmed.coins == Decimal("25.02")
