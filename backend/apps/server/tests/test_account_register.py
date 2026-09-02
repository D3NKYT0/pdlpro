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


def _gateway() -> NullLineageGateway:
    gateway = DependencyInjection.root().resolve(ILineageGateway)
    assert isinstance(gateway, NullLineageGateway)
    return gateway


@pytest.mark.django_db
def test_accounts_report_primary_taken_when_username_already_linked(api):
    owner = User.objects.create_user(username="owner1", email="owner@pdl.dev", password="Secret123")
    player = User.objects.create_user(username="admin", email="admin@pdl.dev", password="Secret123")
    gateway = _gateway()
    gateway.register_account("admin", "GmPass1", "gm@pdl.dev")
    gateway.link_account("admin", str(owner.id))

    api.force_authenticate(user=player)
    listed = api.get("/api/v1/customer/server/accounts/")
    assert listed.status_code == 200
    assert listed.data["primary"] == {"login": "admin", "status": "taken"}
    assert listed.data["accounts"] == []


@pytest.mark.django_db
def test_register_creates_alternate_login_when_username_is_taken(api):
    owner = User.objects.create_user(username="owner1", email="owner@pdl.dev", password="Secret123")
    player = User.objects.create_user(username="admin", email="admin@pdl.dev", password="Secret123")
    gateway = _gateway()
    gateway.register_account("admin", "GmPass1", "gm@pdl.dev")
    gateway.link_account("admin", str(owner.id))

    api.force_authenticate(user=player)
    blocked = api.post("/api/v1/customer/server/accounts/register/", {"password": "l2pass1"}, format="json")
    assert blocked.status_code == 409
    assert blocked.data["error_code"] == "ACCOUNT_ALREADY_LINKED"

    created = api.post(
        "/api/v1/customer/server/accounts/register/",
        {"password": "l2pass1", "login": "admin2"},
        format="json",
    )
    assert created.status_code == 200, created.data
    assert created.data["login"] == "admin2"

    listed = api.get("/api/v1/customer/server/accounts/")
    assert listed.data["accounts"][0]["login"] == "admin2"
    assert listed.data["accounts"][0]["is_primary"] is True
    assert listed.data["slots"]["used"] == 0


@pytest.mark.django_db
def test_register_claims_unlinked_existing_login_with_password(api):
    player = User.objects.create_user(username="hero", email="hero@pdl.dev", password="Secret123")
    gateway = _gateway()
    gateway.register_account("hero", "GamePass1", "old@pdl.dev")

    api.force_authenticate(user=player)
    listed = api.get("/api/v1/customer/server/accounts/")
    assert listed.data["primary"]["status"] == "unclaimed"

    rejected = api.post("/api/v1/customer/server/accounts/register/", {"password": "wrong1"}, format="json")
    assert rejected.status_code == 400

    claimed = api.post("/api/v1/customer/server/accounts/register/", {"password": "GamePass1"}, format="json")
    assert claimed.status_code == 200, claimed.data
    assert claimed.data["login"] == "hero"
    assert gateway.get_account("hero").linked_user_id == str(player.id)


@pytest.mark.django_db
def test_list_hydrates_primary_already_linked_to_current_user(api):
    player = User.objects.create_user(username="hero", email="hero@pdl.dev", password="Secret123")
    gateway = _gateway()
    gateway.register_account("hero", "GamePass1", "hero@pdl.dev")
    gateway.link_account("hero", str(player.id))

    api.force_authenticate(user=player)
    listed = api.get("/api/v1/customer/server/accounts/")
    assert listed.status_code == 200
    assert listed.data["primary"]["status"] == "owned"
    assert listed.data["accounts"][0]["login"] == "hero"
    assert listed.data["accounts"][0]["is_primary"] is True
    assert ManagedLineageAccount.objects.filter(user=player, login="hero", is_primary=True).exists()


@pytest.mark.django_db
def test_link_existing_account_becomes_primary_when_username_is_taken(api):
    owner = User.objects.create_user(username="owner1", email="owner@pdl.dev", password="Secret123")
    player = User.objects.create_user(username="admin", email="admin@pdl.dev", password="Secret123")
    gateway = _gateway()
    gateway.register_account("admin", "GmPass1", "gm@pdl.dev")
    gateway.link_account("admin", str(owner.id))
    gateway.register_account("knight", "GamePass1", "knight@pdl.dev")

    api.force_authenticate(user=player)
    linked = api.post(
        "/api/v1/customer/server/accounts/link/",
        {"login": "knight", "password": "GamePass1"},
        format="json",
    )
    assert linked.status_code == 200, linked.data

    listed = api.get("/api/v1/customer/server/accounts/")
    assert listed.data["accounts"][0]["login"] == "knight"
    assert listed.data["accounts"][0]["is_primary"] is True
    assert listed.data["slots"]["used"] == 0
