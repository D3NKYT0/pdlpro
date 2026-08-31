import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.communication.infrastructure.models import PushSubscription

User = get_user_model()


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(username="push01", email="push01@pdl.dev", password="Secret123")


@pytest.mark.django_db
def test_vapid_and_subscribe(api, user):
    api.force_authenticate(user=user)
    vapid = api.get("/api/v1/customer/push/vapid/")
    assert vapid.status_code == 200
    assert vapid.data["enabled"] is False
    subscribed = api.post(
        "/api/v1/customer/push/subscribe/",
        {
            "endpoint": "https://push.example/sub/1",
            "keys": {"auth": "auth-key", "p256dh": "p256-key"},
        },
        format="json",
    )
    assert subscribed.status_code == 200, subscribed.data
    assert subscribed.data["subscribed"] is True
    assert PushSubscription.objects.filter(user=user).count() == 1
    removed = api.delete(
        "/api/v1/customer/push/subscribe/",
        {"endpoint": "https://push.example/sub/1"},
        format="json",
    )
    assert removed.status_code == 200
    assert PushSubscription.objects.filter(user=user).count() == 0
