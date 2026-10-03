"""JWT com cabeçalho profundamente aninhado deve falhar sem erro de servidor."""

import base64

import pytest
from asgiref.sync import async_to_sync
from rest_framework.test import APIClient

from apps.accounts.infrastructure.authentication import (
    get_access_cookie_name,
    get_refresh_cookie_name,
)
from common.websocket_auth import CookieJWTAuthMiddleware


@pytest.fixture
def nested_header_token():
    """Entrada não assinada que excede o limite de profundidade do parser JSON."""
    header = base64.urlsafe_b64encode(b"[" * 200_000).rstrip(b"=").decode()
    return f"{header}.e30.eA"


@pytest.mark.django_db
@pytest.mark.parametrize("transport", ["cookie", "bearer"])
def test_http_rejects_nested_jwt_header(nested_header_token, transport):
    client = APIClient()
    if transport == "cookie":
        client.cookies[get_access_cookie_name()] = nested_header_token
    else:
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {nested_header_token}")

    response = client.get("/api/v1/shared/me/")

    assert response.status_code == 401


@pytest.mark.django_db
def test_refresh_rejects_nested_jwt_header(nested_header_token):
    client = APIClient()
    client.cookies[get_refresh_cookie_name()] = nested_header_token

    response = client.post("/api/v1/auth/refresh/", {}, format="json")

    assert response.status_code == 401


@pytest.mark.django_db(transaction=True)
@pytest.mark.parametrize("transport", ["cookie", "bearer"])
def test_websocket_rejects_nested_jwt_header(nested_header_token, transport):
    async def app(scope, receive, send):
        return scope["user"]

    headers = (
        [(b"cookie", f"{get_access_cookie_name()}={nested_header_token}".encode())]
        if transport == "cookie"
        else [(b"authorization", f"Bearer {nested_header_token}".encode())]
    )
    middleware = CookieJWTAuthMiddleware(app)

    user = async_to_sync(middleware)({"headers": headers}, None, None)

    assert not user.is_authenticated
