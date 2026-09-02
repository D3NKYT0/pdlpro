import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.server.domain.gateways import ILineageGateway
from apps.server.infrastructure.models import ManagedLineageAccount
from apps.server.infrastructure.null_gateway import NullLineageGateway
from common.di.bootstrap import DependencyInjection

User = get_user_model()


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def staff(db):
    return User.objects.create_user(
        username="gmstaff",
        email="gmstaff@pdl.dev",
        password="Secret123",
        is_staff=True,
        role=User.Role.STAFF,
    )


def _gateway() -> NullLineageGateway:
    gateway = DependencyInjection.root().resolve(ILineageGateway)
    assert isinstance(gateway, NullLineageGateway)
    return gateway


@pytest.mark.django_db
def test_player_cannot_inspect_or_unlink_accounts(api):
    player = User.objects.create_user(username="hero", email="hero@pdl.dev", password="Secret123")
    api.force_authenticate(user=player)
    assert api.get("/api/v1/staff/accounts/?login=admin").status_code == 403
    assert api.post("/api/v1/staff/accounts/unlink/", {"login": "admin"}, format="json").status_code == 403


@pytest.mark.django_db
def test_staff_can_inspect_and_clear_account_link_by_login(api, staff):
    owner = User.objects.create_user(username="owner1", email="owner@pdl.dev", password="Secret123")
    gateway = _gateway()
    gateway.register_account("admin", "GmPass1", "gm@pdl.dev")
    gateway.link_account("admin", str(owner.id))
    ManagedLineageAccount.objects.create(user=owner, login="admin", is_primary=True)

    api.force_authenticate(user=staff)
    missing = api.get("/api/v1/staff/accounts/?login=naoexiste")
    assert missing.status_code == 404

    inspected = api.get("/api/v1/staff/accounts/?login=admin")
    assert inspected.status_code == 200, inspected.data
    assert inspected.data["login"] == "admin"
    assert inspected.data["linked"] is True
    assert inspected.data["panel_username"] == "owner1"

    unlinked = api.post("/api/v1/staff/accounts/unlink/", {"login": "admin"}, format="json")
    assert unlinked.status_code == 200, unlinked.data
    assert unlinked.data["linked"] is False
    assert unlinked.data["panel_username"] is None
    assert gateway.get_account("admin").linked_user_id is None
    assert not ManagedLineageAccount.objects.filter(login__iexact="admin").exists()
