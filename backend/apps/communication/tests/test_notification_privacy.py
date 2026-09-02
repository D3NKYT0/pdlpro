"""Leitura individual e coletiva altera somente avisos do usuário autenticado."""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.communication.infrastructure.models import Notification

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize("all_notifications", [False, True])
def test_reading_notifications_does_not_touch_other_users(all_notifications):
    users = [get_user_model().objects.create_user(username=name, email=f"{name}@test.dev") for name in ("owner", "other")]
    own, foreign = [Notification.objects.create(user=user, title=user.username) for user in users]
    client = APIClient()
    client.force_authenticate(users[0])
    response = client.get("/api/v1/customer/notifications/")
    assert response.data["unread"] == 1
    assert [row["title"] for row in response.data["results"]] == ["owner"]
    url = "/api/v1/customer/notifications/read-all/" if all_notifications else f"/api/v1/customer/notifications/{own.id}/read/"
    for _ in range(2):
        assert client.post(url).status_code == 200
    own.refresh_from_db()
    foreign.refresh_from_db()
    assert own.is_read
    assert not foreign.is_read
    assert client.get("/api/v1/customer/notifications/").data["unread"] == 0


def test_foreign_notification_id_is_not_readable():
    users = [get_user_model().objects.create_user(username=name, email=f"{name}@test.dev") for name in ("owner", "other")]
    foreign = Notification.objects.create(user=users[1], title="Private")
    client = APIClient()
    client.force_authenticate(users[0])
    assert client.post(f"/api/v1/customer/notifications/{foreign.id}/read/").status_code == 404
    foreign.refresh_from_db()
    assert not foreign.is_read
