from datetime import datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

import pytest
from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework.test import APIClient

from apps.payment.infrastructure.models import PedidoPagamento
from apps.wallet.infrastructure.models import Wallet, WalletTransaction
from apps.wallet.infrastructure.repositories import DjangoWalletRepository

pytestmark = pytest.mark.django_db
BASE = "/api/v1/staff/financial-reports/"
REPORTS = ("balances", "cash-flow", "payments", "reconciliation")


def user(name, **kwargs):
    return get_user_model().objects.create_user(username=name, email=f"{name}@pdl.test", **kwargs)


@pytest.fixture
def staff_client():
    client = APIClient()
    client.force_authenticate(user("gm", is_staff=True))
    return client


@pytest.mark.parametrize("report", REPORTS)
def test_reports_require_staff(report):
    client = APIClient()
    assert client.get(f"{BASE}{report}/").status_code in (401, 403)
    client.force_authenticate(user("player"))
    assert client.get(f"{BASE}{report}/").status_code == 403


@pytest.mark.parametrize("report", REPORTS)
def test_empty_reports_and_read_only(staff_client, report):
    response = staff_client.get(f"{BASE}{report}/", {"username": "nobody"})
    assert response.status_code == 200, response.data
    assert response.data["results"] == []
    assert response.data["count"] == 0
    assert response.data["total_pages"] == 1
    assert response["Cache-Control"] == "no-store"
    assert staff_client.post(f"{BASE}{report}/", {}).status_code == 405
    assert Wallet.objects.count() == 0


def test_balance_reconciles_bonus_and_counts_all_filtered_rows(staff_client):
    repo = DjangoWalletRepository()
    wallet = repo.get_or_create(user("alice").id)
    repo.credit(wallet.id, Decimal("100"), origin="stripe", description="Compra")
    repo.credit_bonus(wallet.id, Decimal("10"), origin="bonus", description="Bônus")
    repo.debit(wallet.id, Decimal("20"), destination="shop", description="Loja")
    Wallet.objects.create(user=user("alice2"), balance="7.00")
    response = staff_client.get(f"{BASE}balances/", {"username": "alice", "page_size": 1})
    assert response.status_code == 200, response.data
    data = response.json()
    assert data["count"] == 2
    assert data["total_pages"] == 2
    assert data["next"] is not None
    assert data["summary"]["total_balance"] == "97.00"
    assert data["summary"]["statuses"]["discrepancy"] == 1
    row = data["results"][0]
    assert row["balance"] == "80.00"
    assert row["bonus_balance"] == "10.00"
    assert row["calculated_balance"] == "90.00"
    assert row["difference"] == "0.00"
    assert row["report_status"] == "consistent"
    assert row["transaction_count"] == 3
    assert row["credit_count"] == 2
    assert row["debit_count"] == 1
    assert row["last_transaction"] is not None
    filtered = staff_client.get(f"{BASE}balances/", {"username": "alice", "status": "discrepancy"}).json()
    assert filtered["summary"]["total_balance"] == "7.00"
    assert filtered["count"] == 1
    assert filtered["summary"]["statuses"]["consistent"] == 0


def test_no_wallet_and_signed_reconciliation_filters(staff_client):
    user("missing")
    absent = staff_client.get(f"{BASE}balances/", {"username": "missing"}).json()
    assert absent["results"][0]["report_status"] == "no_wallet"
    assert staff_client.get(f"{BASE}reconciliation/", {"username": "missing"}).json()["count"] == 0
    wallet = Wallet.objects.create(user=user("negative"), balance="8.00")
    WalletTransaction.objects.create(wallet=wallet, kind="ENTRADA", amount="10.00")
    filtered = staff_client.get(f"{BASE}reconciliation/", {"minimum": "-3", "maximum": "-1"}).json()
    assert filtered["count"] == 1
    assert filtered["results"][0]["difference"] == "-2.00"
    assert filtered["summary"]["difference"] == "-2.00"
    assert filtered["summary"]["absolute_difference"] == "2.00"


@pytest.mark.parametrize("balance,status", [("0.01", "consistent"), ("0.02", "review"), ("1.00", "review"), ("1.01", "discrepancy")])
def test_reconciliation_tolerances(staff_client, balance, status):
    Wallet.objects.create(user=user("tolerance"), balance=balance)
    response = staff_client.get(f"{BASE}reconciliation/").json()
    assert response["results"][0]["report_status"] == status


@override_settings(TIME_ZONE="America/Bahia")
def test_cash_flow_dates_totals_timezone_and_chronological_accumulation(staff_client):
    wallet = Wallet.objects.create(user=user("alice"))
    # 02:00 UTC is still the preceding day in Bahia.
    for timestamp, kind, amount in [
        ("2026-08-31T02:00:00", "ENTRADA", "100.00"),
        ("2026-08-31T16:00:00", "SAIDA", "30.00"),
        ("2026-09-01T16:00:00", "ENTRADA", "20.00"),
    ]:
        row = WalletTransaction.objects.create(wallet=wallet, kind=kind, amount=amount)
        WalletTransaction.objects.filter(pk=row.pk).update(created_at=datetime.fromisoformat(timestamp).replace(tzinfo=ZoneInfo("UTC")))
    response = staff_client.get(f"{BASE}cash-flow/", {"page_size": 1}).json()
    assert response["count"] == 3
    assert response["results"][0]["accumulated"] == "90.00"
    filtered = staff_client.get(f"{BASE}cash-flow/", {"date_from": "2026-08-31", "date_to": "2026-09-01"}).json()
    assert filtered["summary"]["credits"] == "20.00"
    assert filtered["summary"]["debits"] == "30.00"
    assert filtered["summary"]["net"] == "-10.00"
    assert filtered["results"][0]["accumulated"] == "-10.00"
    assert filtered["results"][1]["accumulated"] == "-30.00"
    assert filtered["results"][1]["day"] == "2026-08-31"


def test_payments_separate_currencies_confirmed_credits_and_hide_secrets(staff_client):
    player = user("payer")
    for currency, amount, status, method in [
        ("BRL", "100", "confirmed", "mercadopago"),
        ("USD", "20", "confirmed", "stripe"),
        ("USD", "50", "pending", "stripe"),
        ("BRL", "10", "failed", "mock"),
    ]:
        PedidoPagamento.objects.create(
            user=player, currency=currency, amount=amount, status=status, method=method,
            coins="100", bonus_applied="10", total_credited="110", external_id="provider-reference",
            client_secret="private-token", gateway_data={"private": "data"},
        )
    response = staff_client.get(f"{BASE}payments/", {"page_size": 1}).json()
    assert response["count"] == 4
    assert response["summary"]["total_credited"] == "220.00"
    assert response["summary"]["bonus_applied"] == "20.00"
    currencies = {row["currency"]: row for row in response["summary"]["currencies"]}
    assert currencies["BRL"]["confirmed_amount"] == "100.00"
    assert currencies["USD"]["confirmed_amount"] == "20.00"
    assert currencies["USD"]["pending_amount"] == "50.00"
    assert response["results"][0]["payment_source"] == "simulation"
    assert not {"client_secret", "gateway_data", "external_id", "seq_id"} & response["results"][0].keys()
    filtered = staff_client.get(f"{BASE}payments/", {"currency": "USD", "status": "confirmed", "method": "stripe", "minimum": "20", "maximum": "20"}).json()
    assert filtered["count"] == 1
    assert filtered["summary"]["total_credited"] == "110.00"
    assert filtered["results"][0]["payment_source"] == "gateway"


@pytest.mark.parametrize("report,filters", [
    ("cash-flow", {"date_from": "bad-date"}),
    ("cash-flow", {"date_from": "2026-09-02", "date_to": "2026-09-01"}),
    ("payments", {"minimum": "100", "maximum": "1"}),
    ("payments", {"currency": "EUR"}),
    ("payments", {"date_from": "2026-09-02", "date_to": "2026-09-01"}),
    ("balances", {"status": "confirmed"}),
    ("balances", {"minimum": "NaN"}),
    ("reconciliation", {"page": "0"}),
    ("reconciliation", {"page_size": "51"}),
])
def test_invalid_filters(staff_client, report, filters):
    response = staff_client.get(f"{BASE}{report}/", filters)
    assert response.status_code == 400


def test_page_out_of_range(staff_client):
    assert staff_client.get(f"{BASE}balances/", {"page": 999}).status_code == 404
