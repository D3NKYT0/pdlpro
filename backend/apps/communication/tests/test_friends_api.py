import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def alice(db):
    return User.objects.create_user(username="alice1", email="alice1@pdl.dev", password="Secret123")


@pytest.fixture
def bob(db):
    return User.objects.create_user(username="bob123", email="bob123@pdl.dev", password="Secret123")


@pytest.mark.django_db
def test_friend_request_accept_and_message(api, alice, bob):
    api.force_authenticate(user=alice)
    search = api.get("/api/v1/customer/friends/?q=bob")
    assert search.status_code == 200
    assert search.data[0]["username"] == "bob123"
    sent = api.post("/api/v1/customer/friends/", {"username": "bob123"}, format="json")
    assert sent.status_code == 200, sent.data
    assert sent.data["accepted"] is False
    api.force_authenticate(user=bob)
    inbox = api.get("/api/v1/customer/friends/")
    assert inbox.data["incoming"][0]["username"] == "alice1"
    accepted = api.post(f"/api/v1/customer/friends/{sent.data['id']}/accept/")
    assert accepted.status_code == 200
    assert accepted.data["accepted"] is True
    msg = api.post("/api/v1/customer/messages/", {"username": "alice1", "text": "Oi"}, format="json")
    assert msg.status_code == 200, msg.data
    api.force_authenticate(user=alice)
    thread = api.get("/api/v1/customer/messages/?username=bob123")
    assert thread.status_code == 200
    assert thread.data[0]["text"] == "Oi"
