import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(username="hero", email="hero@pdl.dev", password="Secret123")


def _login(api, *, username="hero", password="Secret123"):
    response = api.post("/api/v1/auth/login/", {"login": username, "password": password}, format="json")
    assert response.status_code == 200, response.data
    return response


@pytest.mark.django_db
def test_list_sessions_marks_current_and_hides_blacklisted(api, user):
    first = _login(api)
    current_jti = RefreshToken(api.cookies["PDL-refresh"].value)["jti"]
    other = RefreshToken.for_user(user)
    assert OutstandingToken.objects.filter(user=user).count() >= 2

    listed = api.get("/api/v1/auth/sessions/")
    assert listed.status_code == 200
    ids = {row["id"] for row in listed.data}
    assert current_jti in ids
    assert other["jti"] in ids
    current_rows = [row for row in listed.data if row["current"]]
    assert len(current_rows) == 1
    assert current_rows[0]["id"] == current_jti

    assert api.post("/api/v1/auth/logout/", {}, format="json").status_code == 200
    api.cookies.clear()
    api.force_authenticate(user=user)
    remaining = api.get("/api/v1/auth/sessions/")
    assert remaining.status_code == 200
    assert current_jti not in {row["id"] for row in remaining.data}
    assert other["jti"] in {row["id"] for row in remaining.data}
    assert first.status_code == 200


@pytest.mark.django_db
def test_revoke_other_sessions_preserves_current(api, user):
    _login(api)
    current_jti = RefreshToken(api.cookies["PDL-refresh"].value)["jti"]
    stranger = RefreshToken.for_user(user)
    assert api.post("/api/v1/auth/sessions/revoke-others/", {}, format="json").status_code == 200
    assert BlacklistedToken.objects.filter(token__jti=stranger["jti"]).exists()
    assert not BlacklistedToken.objects.filter(token__jti=current_jti).exists()
    listed = api.get("/api/v1/auth/sessions/")
    assert {row["id"] for row in listed.data} == {current_jti}
    assert api.get("/api/v1/shared/me/").status_code == 200


@pytest.mark.django_db
def test_revoke_session_by_id_and_current_clears_cookies(api, user):
    _login(api)
    current_jti = RefreshToken(api.cookies["PDL-refresh"].value)["jti"]
    other = RefreshToken.for_user(user)
    other_jti = other["jti"]

    closed = api.delete(f"/api/v1/auth/sessions/{other_jti}/")
    assert closed.status_code == 200
    assert closed.data == {"ok": True, "current": False}
    assert BlacklistedToken.objects.filter(token__jti=other_jti).exists()
    assert api.cookies.get("PDL-refresh") is not None

    self_close = api.delete(f"/api/v1/auth/sessions/{current_jti}/")
    assert self_close.status_code == 200
    assert self_close.data == {"ok": True, "current": True}
    assert self_close.cookies.get("PDL-refresh").value == ""
    assert api.get("/api/v1/shared/me/").status_code == 401


@pytest.mark.django_db
def test_cannot_revoke_another_users_session(api, user):
    other = User.objects.create_user(username="villain", email="villain@pdl.dev", password="Secret123")
    foreign = RefreshToken.for_user(other)
    _login(api)
    response = api.delete(f"/api/v1/auth/sessions/{foreign['jti']}/")
    assert response.status_code == 404
    assert not BlacklistedToken.objects.filter(token__jti=foreign["jti"]).exists()
