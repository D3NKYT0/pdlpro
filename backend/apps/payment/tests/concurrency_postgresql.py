"""Cenários PostgreSQL: execute explicitamente com settings de banco isolado."""

from concurrent.futures import ThreadPoolExecutor
from time import monotonic, sleep

import pytest
from django.contrib.auth import get_user_model
from django.db import connection, connections, transaction

from apps.payment.infrastructure.models import PedidoPagamento
from apps.wallet.infrastructure.models import Wallet, WalletTransaction


@pytest.mark.django_db(transaction=True)
def test_simultaneous_confirmations_credit_exactly_once():
    assert connection.vendor == "postgresql", "Este teste exige PostgreSQL isolado."
    user = get_user_model().objects.create_user(
        username="concurrent", email="concurrent@example.invalid"
    )
    wallet = Wallet.objects.create(user=user, balance=0)
    order = PedidoPagamento.objects.create(
        user=user, amount=20, coins=20, method="mock", status="pending"
    )

    def confirm(index):
        try:
            with connection.cursor() as cursor:
                cursor.execute("SET application_name = 'pdl_payment_audit'")
            from apps.payment.application.use_cases import (
                ConfirmPaymentInput,
                ConfirmPaymentUseCase,
            )
            from common.di.bootstrap import DependencyInjection

            use_case = (
                DependencyInjection.root().create_scope().resolve(ConfirmPaymentUseCase)
            )
            return use_case.execute(
                ConfirmPaymentInput(order_id=order.id, user_id=user.id)
            ).status
        finally:
            connections.close_all()

    with ThreadPoolExecutor(max_workers=2) as pool:
        with transaction.atomic():
            Wallet.objects.select_for_update().get(pk=wallet.pk)
            futures = [pool.submit(confirm, index) for index in range(2)]
            deadline = monotonic() + 10
            waiting = 0
            while monotonic() < deadline:
                with connection.cursor() as cursor:
                    cursor.execute("SELECT pg_stat_clear_snapshot()")
                    cursor.execute(
                        "SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND wait_event_type='Lock'"
                    )
                    waiting = cursor.fetchone()[0]
                if waiting == 2:
                    break
                sleep(0.02)
            assert waiting == 2, (
                "As duas requisições devem atingir os bloqueios antes da liberação."
            )
        assert [f.result(timeout=10) for f in futures] == ["confirmed", "confirmed"]
    wallet.refresh_from_db()
    assert wallet.balance == 20
    assert WalletTransaction.objects.filter(wallet=wallet, kind="ENTRADA").count() == 1
