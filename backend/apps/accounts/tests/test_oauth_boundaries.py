"""OAuth usa perfis simulados; estado, identidade e vínculo são persistidos de verdade."""
from urllib.parse import parse_qs, urlparse

import pytest
from allauth.socialaccount.models import SocialAccount
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.core.cache import cache

from apps.accounts.application.oauth import begin_oauth, complete_oauth
from common.exceptions import PdlAPIException

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def oauth_settings(settings):
    settings.GOOGLE_CLIENT_ID = "client"
    settings.GOOGLE_CLIENT_SECRET = "secret"
    settings.DISCORD_CLIENT_ID = "client"
    settings.DISCORD_CLIENT_SECRET = "secret"
    cache.clear()
    yield
    cache.clear()


def begin(provider="google", mode="login", user=None):
    url = begin_oauth(provider, mode, user or AnonymousUser())
    return parse_qs(urlparse(url).query)["state"][0]


@pytest.mark.parametrize("provider", ["google", "discord"])
def test_verified_profile_creates_user_and_consumes_state(provider, mocker):
    profile = {"sub": "uid", "id": "uid", "email": "HERO@Test.dev", "email_verified": True, "verified": True, "name": "Hero"}
    fetch = mocker.patch("apps.accounts.application.oauth._profile", return_value=profile)
    state = begin(provider)
    user, linked = complete_oauth(provider, "code", state)
    assert not linked
    assert user.email == "hero@test.dev"
    assert user.is_email_verified
    assert not user.has_usable_password()
    assert SocialAccount.objects.get(provider=provider, uid="uid").user == user
    with pytest.raises(PdlAPIException):
        complete_oauth(provider, "code", state)
    fetch.assert_called_once()


@pytest.mark.parametrize("profile", [
    {"sub": "uid", "email": "a@test.dev", "email_verified": False},
    {"sub": "uid", "email_verified": True},
    {"email": "a@test.dev", "email_verified": True},
    {"sub": None, "email": "a@test.dev", "email_verified": True},
])
def test_incomplete_identity_never_creates_account(profile, mocker):
    mocker.patch("apps.accounts.application.oauth._profile", return_value=profile)
    with pytest.raises(PdlAPIException):
        complete_oauth("google", "code", begin())
    assert not SocialAccount.objects.exists()
    assert not get_user_model().objects.exists()


def test_provider_mismatch_does_not_contact_provider(mocker):
    fetch = mocker.patch("apps.accounts.application.oauth._profile")
    with pytest.raises(PdlAPIException):
        complete_oauth("discord", "code", begin())
    fetch.assert_not_called()


@pytest.mark.parametrize("provider,mode", [("unknown", "login"), ("google", "invalid"), ("google", "link")])
def test_invalid_begin_is_rejected(provider, mode):
    with pytest.raises(PdlAPIException):
        begin(provider, mode)


def test_unconfigured_provider_rejected(settings):
    settings.GOOGLE_CLIENT_SECRET = ""
    with pytest.raises(PdlAPIException):
        begin()


def test_existing_verified_email_reuses_user(mocker):
    user = get_user_model().objects.create_user(username="existing", email="hero@test.dev")
    mocker.patch("apps.accounts.application.oauth._profile", return_value={"sub": "uid", "email": "HERO@test.dev", "email_verified": True})
    result, linked = complete_oauth("google", "code", begin())
    assert result.pk == user.pk
    assert not linked
    assert get_user_model().objects.count() == 1


def test_link_cannot_take_external_identity_from_another_user(mocker):
    users = [get_user_model().objects.create_user(username=name, email=f"{name}@test.dev") for name in ("owner", "other")]
    SocialAccount.objects.create(user=users[0], provider="google", uid="uid")
    mocker.patch("apps.accounts.application.oauth._profile", return_value={"sub": "uid", "email": "owner@test.dev", "email_verified": True})
    with pytest.raises(PdlAPIException):
        complete_oauth("google", "code", begin(mode="link", user=users[1]))
    assert SocialAccount.objects.get(uid="uid").user == users[0]


def test_disabled_account_cannot_login_via_social(mocker):
    user = get_user_model().objects.create_user(username="disabled", email="hero@test.dev", is_active=False)
    SocialAccount.objects.create(user=user, provider="google", uid="uid")
    mocker.patch("apps.accounts.application.oauth._profile", return_value={"sub": "uid", "email": user.email, "email_verified": True})
    with pytest.raises(PdlAPIException):
        complete_oauth("google", "code", begin())
