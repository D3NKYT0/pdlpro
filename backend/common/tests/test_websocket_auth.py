"""Autenticação ASGI exercitada com tokens reais e banco de teste."""
from asgiref.sync import async_to_sync
import pytest
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken

from apps.accounts.infrastructure.authentication import get_access_cookie_name
from common.websocket_auth import CookieJWTAuthMiddleware


async def authenticate(headers):
    async def app(scope, receive, send):
        return scope["user"]
    return await CookieJWTAuthMiddleware(app)({"headers": headers}, None, None)


@pytest.mark.django_db(transaction=True)
@pytest.mark.parametrize("kind", ["cookie", "bearer", "mixed-case"])
def test_websocket_accepts_valid_active_user(kind):
    user = get_user_model().objects.create_user(username="socket", email="socket@test.dev")
    token = str(AccessToken.for_user(user))
    headers = [(b"cookie", f"{get_access_cookie_name()}={token}".encode())] if kind == "cookie" else [(b"Authorization" if kind == "mixed-case" else b"authorization", f"Bearer {token}".encode())]
    assert async_to_sync(authenticate)(headers).id == user.id


@pytest.mark.django_db(transaction=True)
@pytest.mark.parametrize("kind", ["absent", "invalid", "inactive", "expired", "cookie-precedence"])
def test_websocket_fails_closed(kind):
    user = get_user_model().objects.create_user(username="socket", email="socket@test.dev")
    token = AccessToken.for_user(user)
    if kind == "inactive":
        user.is_active = False
        user.save()
    if kind == "expired":
        token["exp"] = 1
    headers = [(b"authorization", f"Bearer {'bad' if kind == 'invalid' else token}".encode())]
    if kind == "absent":
        headers = []
    if kind == "cookie-precedence":
        headers.append((b"cookie", f"{get_access_cookie_name()}=bad".encode()))
    assert not async_to_sync(authenticate)(headers).is_authenticated
