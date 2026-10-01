from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.payment.application.pricing import CoinPricingService
from apps.payment.application.use_cases import (
    CreatePaymentOrderInput,
    CreatePaymentOrderUseCase,
    GetPaymentCatalogUseCase,
)
from apps.payment.domain.exceptions import (
    PaymentNotPendingError,
    PaymentOrderNotFoundError,
)
from apps.payment.infrastructure.models import PedidoPagamento
from apps.wallet.infrastructure.models import (
    CoinPackage,
    CoinPackagePrice,
    WalletChargeCurrency,
)
from common.architecture.exceptions import ValidationDomainError
from common.di.bootstrap import DependencyInjection

pytestmark = pytest.mark.django_db


@pytest.fixture
def owner():
    return get_user_model().objects.create_user(username="curr_owner", email="curr_owner@test.dev")


@pytest.fixture
def staff_admin():
    return get_user_model().objects.create_superuser(
        username="curr_admin", email="curr_admin@test.dev", password="admin-password-123"
    )


@pytest.fixture
def staff_api(staff_admin):
    client = APIClient()
    client.force_authenticate(staff_admin)
    return client


@pytest.fixture
def customer_api(owner):
    client = APIClient()
    client.force_authenticate(owner)
    return client


def _pricing() -> CoinPricingService:
    return DependencyInjection.root().create_scope().resolve(CoinPricingService)


def _setup_currencies():
    WalletChargeCurrency.objects.update_or_create(
        code="BRL",
        defaults={"coins_per_unit": Decimal("1.00"), "settlement": True, "enabled": True, "sort_order": 0},
    )
    WalletChargeCurrency.objects.update_or_create(
        code="USD",
        defaults={"coins_per_unit": Decimal("5.00"), "settlement": False, "enabled": True, "sort_order": 1},
    )
    WalletChargeCurrency.objects.update_or_create(
        code="EUR",
        defaults={"coins_per_unit": Decimal("6.00"), "settlement": False, "enabled": True, "sort_order": 2},
    )


def test_quote_package_charges_price_for_requested_currency():
    _setup_currencies()
    package = CoinPackage.objects.create(code="multicurrency-pack", name="Multi", coins=100, price_brl=30, price_usd=6)
    CoinPackagePrice.objects.create(package=package, currency_code="EUR", amount=Decimal("5.50"))

    pricing = _pricing()
    quote_brl = pricing.quote(package_id=package.code, amount=None, currency="BRL")
    assert quote_brl.amount == Decimal("30.00")
    assert quote_brl.currency == "BRL"

    quote_usd = pricing.quote(package_id=package.code, amount=None, currency="USD")
    assert quote_usd.amount == Decimal("6.00")
    assert quote_usd.currency == "USD"

    quote_eur = pricing.quote(package_id=package.code, amount=None, currency="EUR")
    assert quote_eur.amount == Decimal("5.50")
    assert quote_eur.currency == "EUR"


def test_quote_custom_amount_uses_currency_coins_per_unit():
    _setup_currencies()
    pricing = _pricing()

    # 10 BRL * 1.00 = 10.00 coins
    quote_brl = pricing.quote(package_id=None, amount=Decimal("10.00"), currency="BRL")
    assert quote_brl.coins == Decimal("10.00")

    # 10 USD * 5.00 = 50.00 coins
    quote_usd = pricing.quote(package_id=None, amount=Decimal("10.00"), currency="USD")
    assert quote_usd.coins == Decimal("50.00")

    # 10 EUR * 6.00 = 60.00 coins
    quote_eur = pricing.quote(package_id=None, amount=Decimal("10.00"), currency="EUR")
    assert quote_eur.coins == Decimal("60.00")


def test_disabled_currency_fails_quote():
    _setup_currencies()
    WalletChargeCurrency.objects.filter(code="EUR").update(enabled=False)
    pricing = _pricing()

    with pytest.raises(ValidationDomainError):
        pricing.quote(package_id=None, amount=Decimal("10.00"), currency="EUR")


def test_package_without_price_in_currency_fails_quote():
    _setup_currencies()
    # Package only has BRL and USD
    package = CoinPackage.objects.create(code="no-eur", name="No EUR", coins=50, price_brl=20, price_usd=4)

    pricing = _pricing()
    with pytest.raises(ValidationDomainError):
        pricing.quote(package_id=package.code, amount=None, currency="EUR")


def test_reopen_by_source_order_id_requotes_in_requested_currency(owner, mocker, settings):
    from types import SimpleNamespace

    _setup_currencies()
    settings.PAYMENT_METHODS = ["stripe"]
    settings.STRIPE_ACTIVATE_PAYMENTS = True
    settings.STRIPE_SECRET_KEY = "sk-test"
    settings.STRIPE_PUBLISHABLE_KEY = "pk-test"
    settings.STRIPE_PRESENTMENT_CURRENCIES = "BRL,USD,EUR"
    mocker.patch("stripe.PaymentIntent.create", return_value=SimpleNamespace(id="pi-reopen", client_secret="cs-reopen"))

    # Pedido avulso original em USD (10 coins -> amount = 2.00 USD pois 10 / 5 = 2)
    source = PedidoPagamento.objects.create(
        user=owner,
        amount=Decimal("2.00"),
        coins=Decimal("10.00"),
        currency="USD",
        method="stripe",
        status="pending",
    )

    use_case = DependencyInjection.root().create_scope().resolve(CreatePaymentOrderUseCase)
    reopened = use_case.execute(
        CreatePaymentOrderInput(user_id=owner.id, currency="BRL", method="stripe", source_order_id=source.id)
    )

    # 10 coins em BRL (taxa 1.00) = 10.00 BRL
    assert reopened.currency == "BRL"
    assert reopened.amount == Decimal("10.00")
    assert reopened.coins == Decimal("10.00")


def test_reopen_rejects_another_user_and_non_pending_order(owner):
    _setup_currencies()
    other = get_user_model().objects.create_user(username="other_u", email="other_u@test.dev")
    foreign = PedidoPagamento.objects.create(
        user=other, amount=Decimal("10.00"), coins=Decimal("10.00"), currency="BRL", method="stripe", status="pending"
    )

    use_case = DependencyInjection.root().create_scope().resolve(CreatePaymentOrderUseCase)
    with pytest.raises(PaymentOrderNotFoundError):
        use_case.execute(
            CreatePaymentOrderInput(user_id=owner.id, currency="USD", method="stripe", source_order_id=foreign.id)
        )

    # Não pendente
    own_confirmed = PedidoPagamento.objects.create(
        user=owner, amount=Decimal("10.00"), coins=Decimal("10.00"), currency="BRL", method="stripe", status="confirmed"
    )
    with pytest.raises(PaymentNotPendingError):
        use_case.execute(
            CreatePaymentOrderInput(user_id=owner.id, currency="USD", method="stripe", source_order_id=own_confirmed.id)
        )


def test_mercadopago_does_not_offer_currency_other_than_brl(customer_api, settings):
    _setup_currencies()
    settings.PAYMENT_METHODS = ["mercadopago", "stripe"]
    settings.MERCADO_PAGO_ACTIVATE_PAYMENTS = True
    settings.MERCADO_PAGO_ACCESS_TOKEN = "mp-token"
    settings.MERCADO_PAGO_PUBLIC_KEY = "mp-pk"

    response = customer_api.get("/api/v1/customer/payments/catalog/")
    assert response.status_code == 200
    mp_method = next(m for m in response.data["methods"] if m["id"] == "mercadopago")
    assert mp_method["currencies"] == ["BRL"]

    # Tentativa de criar pedido em USD no mercadopago deve falhar
    res_order = customer_api.post(
        "/api/v1/customer/payments/",
        {"amount": "10.00", "currency": "USD", "method": "mercadopago"},
        format="json",
    )
    assert res_order.status_code == 400


def test_stripe_offers_only_intersection_of_enabled_currencies_and_presentment(settings):
    _setup_currencies()
    settings.PAYMENT_METHODS = ["stripe"]
    settings.STRIPE_ACTIVATE_PAYMENTS = True
    settings.STRIPE_SECRET_KEY = "sk-test"
    settings.STRIPE_PUBLISHABLE_KEY = "pk-test"

    # Caso 1: EUR está habilitado em WalletChargeCurrency, mas NÃO está em STRIPE_PRESENTMENT_CURRENCIES
    settings.STRIPE_PRESENTMENT_CURRENCIES = "BRL,USD"
    catalog_uc = DependencyInjection.root().create_scope().resolve(GetPaymentCatalogUseCase)
    catalog = catalog_uc.execute()
    currency_codes = [c["code"] for c in catalog["currencies"]]
    assert "EUR" not in currency_codes
    assert set(currency_codes) == {"BRL", "USD"}

    stripe_entry = next(m for m in catalog["methods"] if m["id"] == "stripe")
    assert "EUR" not in stripe_entry["currencies"]

    # Caso 2: EUR incluído em STRIPE_PRESENTMENT_CURRENCIES e habilitado
    settings.STRIPE_PRESENTMENT_CURRENCIES = "BRL,USD,EUR"
    catalog = catalog_uc.execute()
    currency_codes = [c["code"] for c in catalog["currencies"]]
    assert "EUR" in currency_codes

    # Caso 3: EUR em STRIPE_PRESENTMENT_CURRENCIES mas DESABILITADO em WalletChargeCurrency
    WalletChargeCurrency.objects.filter(code="EUR").update(enabled=False)
    catalog = catalog_uc.execute()
    currency_codes = [c["code"] for c in catalog["currencies"]]
    assert "EUR" not in currency_codes


def test_admin_staff_currencies_api_crud_and_validations(staff_api):
    _setup_currencies()

    # Listar moedas
    res = staff_api.get("/api/v1/staff/charge-currencies/")
    assert res.status_code == 200
    codes = [item["code"] for item in res.data]
    assert "BRL" in codes
    assert "USD" in codes

    # Tentar desabilitar a moeda de liquidação (BRL)
    res_disable = staff_api.post(
        "/api/v1/staff/charge-currencies/",
        {"code": "BRL", "enabled": False},
        format="json",
    )
    assert res_disable.status_code == 400
    assert "liquidação" in res_disable.data.get("message", "").lower()

    # Tentar remover a moeda de liquidação
    res_del = staff_api.delete(
        "/api/v1/staff/charge-currencies/",
        {"code": "BRL"},
        format="json",
    )
    assert res_del.status_code == 400

    # Tentar cadastrar código fora do ISO 4217 (ex.: código de 4 letras ou números)
    res_invalid_code = staff_api.post(
        "/api/v1/staff/charge-currencies/",
        {"code": "USDD", "coins_per_unit": "5.00"},
        format="json",
    )
    assert res_invalid_code.status_code == 400

    # Cadastrar nova moeda válida (GBP)
    res_create = staff_api.post(
        "/api/v1/staff/charge-currencies/",
        {"code": "GBP", "coins_per_unit": "7.50", "enabled": True, "sort_order": 5},
        format="json",
    )
    assert res_create.status_code == 200
    assert res_create.data["code"] == "GBP"
    assert res_create.data["coins_per_unit"] == "7.50"

    # Atualizar taxa de GBP
    res_update = staff_api.put(
        "/api/v1/staff/charge-currencies/",
        {"code": "GBP", "coins_per_unit": "8.00"},
        format="json",
    )
    assert res_update.status_code == 200
    assert res_update.data["coins_per_unit"] == "8.00"

    # Remover GBP
    res_remove = staff_api.delete(
        "/api/v1/staff/charge-currencies/",
        {"code": "GBP"},
        format="json",
    )
    assert res_remove.status_code == 200
    assert res_remove.data.get("deleted") is True
