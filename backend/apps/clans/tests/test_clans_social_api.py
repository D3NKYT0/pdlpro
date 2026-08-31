import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def leader(db):
    return User.objects.create_user(username="leader1", email="leader1@pdl.dev", password="Secret123")


@pytest.fixture
def member(db):
    return User.objects.create_user(username="member1", email="member1@pdl.dev", password="Secret123")


@pytest.mark.django_db
def test_create_clan_and_apply(api, leader, member):
    api.force_authenticate(user=leader)
    created = api.post(
        "/api/v1/customer/clans/",
        {"name": "Dark Avengers", "focus": "PVP", "description": "PvP sérios"},
        format="json",
    )
    assert created.status_code == 200, created.data
    clan_id = created.data["id"]
    public = api.get("/api/v1/public/clans/")
    assert public.status_code == 200
    assert public.data[0]["name"] == "Dark Avengers"
    api.force_authenticate(user=member)
    applied = api.post(
        f"/api/v1/customer/clans/{clan_id}/apply/",
        {"char_name": "SirTest", "message": "Quero entrar"},
        format="json",
    )
    assert applied.status_code == 200, applied.data
    duplicate = api.post(
        f"/api/v1/customer/clans/{clan_id}/apply/",
        {"char_name": "SirTest", "message": "de novo"},
        format="json",
    )
    assert duplicate.status_code == 409
    api.force_authenticate(user=leader)
    inbox = api.get(f"/api/v1/customer/clans/{clan_id}/applications/")
    assert inbox.status_code == 200
    assert inbox.data[0]["char_name"] == "SirTest"
    reviewed = api.post(
        f"/api/v1/customer/clans/applications/{applied.data['id']}/review/",
        {"status": "approved"},
        format="json",
    )
    assert reviewed.status_code == 200
    assert reviewed.data["status"] == "approved"
