from __future__ import annotations

from http.cookies import SimpleCookie

from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser

from apps.accounts.infrastructure.authentication import get_access_cookie_name

User = get_user_model()


def _header_map(scope) -> dict[bytes, bytes]:
    return {key.lower(): value for key, value in scope.get("headers", [])}


def _extract_bearer_token(scope) -> str | None:
    auth_header = _header_map(scope).get(b"authorization", b"").decode()
    if auth_header.lower().startswith("bearer "):
        return auth_header.split(" ", 1)[1].strip()
    return None


def _extract_cookie_token(scope) -> str | None:
    raw_cookie = _header_map(scope).get(b"cookie", b"").decode()
    if not raw_cookie:
        return None
    cookie = SimpleCookie()
    cookie.load(raw_cookie)
    morsel = cookie.get(get_access_cookie_name())
    return morsel.value if morsel else None


@database_sync_to_async
def get_user_from_access_token(token_key: str):
    from rest_framework_simplejwt.tokens import AccessToken

    try:
        access_token = AccessToken(token_key)
        from rest_framework_simplejwt.authentication import JWTAuthentication
        return JWTAuthentication().get_user(access_token)
    except Exception:
        return AnonymousUser()


class CookieJWTAuthMiddleware:
    """Preenche scope['user'] a partir do JWT do WebSocket.

    Envolva a aplicação ASGI/URLRouter com esta classe. O cookie de acesso tem prioridade sobre
    Authorization Bearer; token ausente, inválido ou usuário inativo resulta em AnonymousUser. O
    consumer ainda deve rejeitar conexões anônimas ou sem permissão para o recurso solicitado.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        token = _extract_cookie_token(scope) or _extract_bearer_token(scope)
        scope["user"] = await get_user_from_access_token(token) if token else AnonymousUser()
        return await self.app(scope, receive, send)
