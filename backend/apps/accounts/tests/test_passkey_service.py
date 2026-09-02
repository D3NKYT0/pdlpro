"""Passkeys: desafios reais, isolamento de usuário e fronteira criptográfica simulada."""
from types import SimpleNamespace

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APIClient
from webauthn.helpers import base64url_to_bytes, bytes_to_base64url
from webauthn.helpers.exceptions import InvalidAuthenticationResponse, InvalidRegistrationResponse

from apps.accounts.application import webauthn_service as service
from apps.accounts.infrastructure.models import WebAuthnCredential

pytestmark = pytest.mark.django_db


@pytest.fixture
def owner(settings):
    settings.WEBAUTHN_RP_ID = "test.dev"
    settings.WEBAUTHN_ORIGINS = ["https://test.dev"]
    cache.clear()
    return get_user_model().objects.create_user(username="passkey", email="passkey@test.dev")


@pytest.fixture
def key(owner):
    return WebAuthnCredential.objects.create(user=owner, credential_id=b"credential", public_key=b"public-key", sign_count=3, transports=["internal"])


def test_registration_verifies_binding_and_persists_public_credential(owner, mocker):
    verify = mocker.patch.object(service, "verify_registration_response", return_value=SimpleNamespace(credential_id=b"new-key", credential_public_key=b"public-key", sign_count=0, aaguid=None))
    begin = service.begin_registration(owner, "Laptop")
    result = service.complete_registration(owner, begin["state"], {"response": {"transports": ["internal"]}})
    assert result.user == owner
    assert result.nickname == "Laptop"
    assert bytes(result.credential_id) == b"new-key"
    assert verify.call_args.kwargs["expected_challenge"] == base64url_to_bytes(begin["options"]["challenge"])
    assert verify.call_args.kwargs["expected_rp_id"] == "test.dev"
    assert verify.call_args.kwargs["expected_origin"] == ["https://test.dev"]
    assert verify.call_args.kwargs["require_user_verification"] is True
    with pytest.raises(service.WebAuthnError):
        service.complete_registration(owner, begin["state"], {})
    verify.assert_called_once()


def test_registration_cannot_use_another_users_challenge(owner, mocker):
    other = get_user_model().objects.create_user(username="other", email="other@test.dev")
    verify = mocker.patch.object(service, "verify_registration_response")
    begin = service.begin_registration(owner)
    with pytest.raises(service.WebAuthnError):
        service.complete_registration(other, begin["state"], {})
    verify.assert_not_called()
    assert not WebAuthnCredential.objects.exists()


@pytest.mark.parametrize("login", ["PASSKEY", "PASSKEY@TEST.DEV", ""])
def test_authentication_updates_sign_count_and_consumes_challenge(owner, key, mocker, login):
    verify = mocker.patch.object(service, "verify_authentication_response", return_value=SimpleNamespace(new_sign_count=4))
    begin = service.begin_authentication(login)
    result = service.complete_authentication(begin["state"], {"rawId": bytes_to_base64url(b"credential")})
    assert result == owner
    key.refresh_from_db()
    assert key.sign_count == 4
    assert key.last_used_at is not None
    assert verify.call_args.kwargs["credential_current_sign_count"] == 3
    assert verify.call_args.kwargs["require_user_verification"] is True
    with pytest.raises(service.WebAuthnError):
        service.complete_authentication(begin["state"], {"id": bytes_to_base64url(b"credential")})


@pytest.mark.parametrize("reason", ["unknown-key", "inactive", "other-user", "wrong-kind", "expired"])
def test_invalid_authentication_never_reaches_crypto_verifier(owner, key, mocker, reason):
    other = get_user_model().objects.create_user(username="other", email="other@test.dev")
    begin = service.begin_registration(owner) if reason == "wrong-kind" else service.begin_authentication(other.username if reason == "other-user" else owner.username)
    if reason == "inactive":
        owner.is_active = False
        owner.save()
    if reason == "expired":
        cache.clear()
    verify = mocker.patch.object(service, "verify_authentication_response")
    raw_id = b"missing" if reason == "unknown-key" else b"credential"
    with pytest.raises(service.WebAuthnError):
        service.complete_authentication(begin["state"], {"id": bytes_to_base64url(raw_id)})
    verify.assert_not_called()
    key.refresh_from_db()
    assert key.sign_count == 3


def test_registration_excludes_existing_keys(owner, key):
    begin = service.begin_registration(owner)
    assert begin["options"]["excludeCredentials"][0]["id"] == bytes_to_base64url(b"credential")
    assert begin["options"]["excludeCredentials"][0]["transports"] == ["internal"]


def test_unknown_transport_does_not_break_options(owner, key):
    key.transports = ["internal", "future-transport", None]
    key.save()
    begin = service.begin_authentication(owner.username)
    assert begin["options"]["allowCredentials"][0]["transports"] == ["internal"]


def test_passkey_delete_is_private(owner, key):
    client = APIClient()
    other = get_user_model().objects.create_user(username="other", email="other@test.dev")
    client.force_authenticate(other)
    assert client.get("/api/v1/auth/passkeys/").data == []
    assert client.delete(f"/api/v1/auth/passkeys/{key.id}/").status_code == 404
    client.force_authenticate(owner)
    assert client.delete(f"/api/v1/auth/passkeys/{key.id}/").status_code == 204
    assert not WebAuthnCredential.objects.exists()


def test_invalid_registration_signature_returns_400(owner, mocker):
    client = APIClient()
    client.force_authenticate(owner)
    begin = service.begin_registration(owner)
    mocker.patch.object(service, "verify_registration_response", side_effect=InvalidRegistrationResponse("bad signature"))
    response = client.post("/api/v1/auth/passkeys/register/complete/", {"state": begin["state"], "credential": {"id": "bad"}}, format="json")
    assert response.status_code == 400
    assert not WebAuthnCredential.objects.exists()


def test_invalid_authentication_signature_returns_401(owner, key, mocker):
    begin = service.begin_authentication(owner.username)
    mocker.patch.object(service, "verify_authentication_response", side_effect=InvalidAuthenticationResponse("bad signature"))
    response = APIClient().post("/api/v1/auth/passkeys/login/complete/", {"state": begin["state"], "credential": {"id": bytes_to_base64url(b"credential")}}, format="json")
    assert response.status_code == 401
    assert not response.cookies
    key.refresh_from_db()
    assert key.sign_count == 3
