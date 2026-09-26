"""Tests for ensure_columns and schema preparation on Lineage databases."""

from io import StringIO
from unittest.mock import MagicMock, patch

import pytest
from django.core.management import call_command
from sqlalchemy import create_engine, text

from apps.server.domain.gateways import ILineageGateway
from apps.server.infrastructure.lineage.catalog import LineageQueryCatalog
from apps.server.infrastructure.sqlalchemy_gateway import SqlAlchemyLineageGateway


@pytest.fixture
def empty_accounts_gateway():
    """Provides a gateway connected to an in-memory SQLite with bare accounts table."""
    catalog = LineageQueryCatalog.load("lucerav2")
    engine = create_engine("sqlite://")
    with engine.begin() as conn:
        conn.execute(
            text(
                "CREATE TABLE accounts ("
                "login VARCHAR(45) PRIMARY KEY, "
                "password VARCHAR(45) NOT NULL"
                ")"
            )
        )
        conn.execute(
            text("INSERT INTO accounts (login, password) VALUES ('player1', 'secret')")
        )
    gw = SqlAlchemyLineageGateway(catalog)
    gw._engine = engine
    yield gw
    engine.dispose()


def test_ensure_columns_adds_missing_fields(empty_accounts_gateway):
    gateway = empty_accounts_gateway

    # First call adds the missing columns
    added = gateway.ensure_columns()
    assert sorted(added) == ["created_time", "email", "linked_uuid"]

    # Verify columns are physically present in the database
    with gateway._engine.connect() as conn:
        row = conn.execute(
            text("SELECT login, email, created_time, linked_uuid FROM accounts WHERE login='player1'")
        ).mappings().first()
        assert row is not None
        assert row["login"] == "player1"
        assert row["email"] == ""
        assert row["created_time"] is None
        assert row["linked_uuid"] is None


def test_ensure_columns_is_idempotent(empty_accounts_gateway):
    gateway = empty_accounts_gateway
    first_run = gateway.ensure_columns()
    assert len(first_run) == 3

    # Subsequent call with cached flag returns empty immediately
    assert gateway.ensure_columns() == []

    # Reset cache and call again: database already has them, so nothing added
    gateway._checked_columns = False
    assert gateway.ensure_columns() == []


def test_auto_ensure_columns_invoked_by_account_queries(empty_accounts_gateway):
    gateway = empty_accounts_gateway
    assert not gateway._checked_columns

    # Calling get_account triggers ensure_columns automatically
    acc = gateway.get_account("player1")
    assert acc is not None
    assert acc.login == "player1"
    assert acc.email == ""
    assert acc.linked_user_id is None
    assert gateway._checked_columns is True


def test_auto_ensure_columns_invoked_by_email_queries(empty_accounts_gateway):
    gateway = empty_accounts_gateway
    assert not gateway._checked_columns

    # Calling find_accounts_by_email triggers ensure_columns automatically
    results = gateway.find_accounts_by_email("test@example.com")
    assert results == []
    assert gateway._checked_columns is True


def test_prepare_lineage_database_command(empty_accounts_gateway, settings):
    settings.LINEAGE_DB_ENABLED = True
    gateway = empty_accounts_gateway
    out = StringIO()

    with patch("common.di.bootstrap.DependencyInjection.root") as mock_root:
        mock_container = MagicMock()
        mock_container.resolve.return_value = gateway
        mock_root.return_value = mock_container

        call_command("prepare_lineage_database", stdout=out)

    output = out.getvalue()
    assert "Colunas adicionadas à tabela accounts com sucesso: email, created_time, linked_uuid" in output

    # Second run should report columns already exist
    out2 = StringIO()
    with patch("common.di.bootstrap.DependencyInjection.root") as mock_root:
        mock_container = MagicMock()
        mock_container.resolve.return_value = gateway
        mock_root.return_value = mock_container

        call_command("prepare_lineage_database", stdout=out2)

    assert "todas as colunas necessárias" in out2.getvalue()


