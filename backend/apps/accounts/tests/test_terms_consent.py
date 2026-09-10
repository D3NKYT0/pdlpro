import pytest
from django.conf import settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.infrastructure.models import User


@pytest.fixture
def api():
    return APIClient()


@pytest.mark.django_db
def test_register_records_terms_version_and_audit(api):
    response = api.post(
        "/api/v1/auth/register/",
        {
            "username": "legalhero",
            "email": "legalhero@pdl.dev",
            "password": "Secret123!",
            "accept_terms": True,
        },
        format="json",
        HTTP_USER_AGENT="PDL-TestAgent/1.0",
        REMOTE_ADDR="203.0.113.10",
    )
    assert response.status_code == 200
    user = User.objects.get(username="legalhero")
    assert user.terms_accepted_at is not None
    assert user.terms_and_privacy_version == settings.LEGAL_DOCS_VERSION
    assert user.terms_accepted_ip == "203.0.113.10"
    assert "PDL-TestAgent" in user.terms_accepted_user_agent
    me = api.get("/api/v1/shared/me/")
    assert me.status_code == 200
    assert me.data["needs_terms_acceptance"] is False
    assert me.data["current_legal_docs_version"] == settings.LEGAL_DOCS_VERSION
    assert me.data["terms_and_privacy_version"] == settings.LEGAL_DOCS_VERSION


@pytest.mark.django_db
def test_outdated_terms_require_reacceptance(api):
    user = User.objects.create_user("stale", "stale@pdl.dev", password="Secret123!")
    user.terms_accepted_at = timezone.now()
    user.terms_and_privacy_version = "2020-01-01"
    user.save(update_fields=["terms_accepted_at", "terms_and_privacy_version"])
    api.force_authenticate(user=user)

    me = api.get("/api/v1/shared/me/")
    assert me.status_code == 200
    assert me.data["needs_terms_acceptance"] is True

    rejected = api.post("/api/v1/shared/me/accept-terms/", {"terms_accepted": False}, format="json")
    assert rejected.status_code == 400

    accepted = api.post(
        "/api/v1/shared/me/accept-terms/",
        {"terms_accepted": True},
        format="json",
        HTTP_USER_AGENT="ReacceptAgent/2.0",
        REMOTE_ADDR="198.51.100.50",
    )
    assert accepted.status_code == 200
    assert accepted.data["needs_terms_acceptance"] is False
    assert accepted.data["terms_and_privacy_version"] == settings.LEGAL_DOCS_VERSION

    user.refresh_from_db()
    assert user.terms_accepted_ip == "198.51.100.50"
    assert "ReacceptAgent" in user.terms_accepted_user_agent
