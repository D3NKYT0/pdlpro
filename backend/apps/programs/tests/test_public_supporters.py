import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.programs.models import Supporter, SystemResource

pytestmark = pytest.mark.django_db


def user(name):
    return get_user_model().objects.create_user(username=name, email=f"{name}@example.test", password="secret123")


def test_public_showcase_lists_only_approved_and_never_private_fields():
    approved = Supporter.objects.create(user=user("approved"), name="Creator", status="approved",
                                       channel_url="https://example.com", review_note="Private note", commission_percent=15)
    for status in ("pending", "rejected"):
        Supporter.objects.create(user=user(status), name=status, status=status, channel_url="https://example.com")
    response = APIClient().get("/api/v1/public/supporters/")
    assert response.status_code == 200
    assert response.json() == [{"id": str(approved.id), "name": "Creator", "channel_url": "https://example.com", "image": None}]


@pytest.mark.parametrize("code", ["supporters", "supporters-public"])
def test_disabling_program_or_showcase_blocks_public_api_without_deleting_records(code):
    Supporter.objects.create(user=user("creator"), name="Creator", status="approved", channel_url="https://example.com")
    resource, _ = SystemResource.objects.update_or_create(code=code, defaults={"enabled": False})
    response = APIClient().get("/api/v1/public/supporters/")
    assert response.status_code == 403
    assert response.json()["error_code"] == "RESOURCE_DISABLED"
    resource.enabled = True
    resource.save()
    assert len(APIClient().get("/api/v1/public/supporters/").json()) == 1
    assert Supporter.objects.count() == 1


def test_empty_showcase_and_write_methods():
    api = APIClient()
    assert api.get("/api/v1/public/supporters/").json() == []
    assert api.post("/api/v1/public/supporters/", {}).status_code == 405


def test_application_requires_login_and_review_and_repetition_keeps_single_profile():
    api = APIClient()
    candidate = user("candidate")
    payload = {"name": "Candidate", "channel_url": "https://example.com", "status": "approved", "commission_percent": 100}
    assert api.post("/api/v1/customer/supporters/", payload).status_code == 401
    api.force_authenticate(candidate)
    for _ in range(2):
        assert api.post("/api/v1/customer/supporters/", payload).status_code == 200
    row = Supporter.objects.get(user=candidate)
    assert row.status == "pending"
    assert row.commission_percent == 0
    assert Supporter.objects.count() == 1
    assert APIClient().get("/api/v1/public/supporters/").json() == []


def test_showcase_and_applications_can_be_disabled_independently():
    candidate = user("candidate")
    api = APIClient()
    api.force_authenticate(candidate)
    SystemResource.objects.update_or_create(code="supporters-public", defaults={"enabled": False})
    assert api.post("/api/v1/customer/supporters/", {"name": "Candidate", "channel_url": "https://example.com"}).status_code == 200
    SystemResource.objects.update_or_create(code="supporters-apply", defaults={"enabled": False})
    SystemResource.objects.update_or_create(code="supporters-public", defaults={"enabled": True})
    assert api.get("/api/v1/public/supporters/").status_code == 200
    assert api.post("/api/v1/customer/supporters/", {"name": "Changed", "channel_url": "https://example.com"}).status_code == 403
    assert Supporter.objects.get(user=candidate).name == "Candidate"
