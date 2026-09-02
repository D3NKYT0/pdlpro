from __future__ import annotations

import json
import re
import secrets
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from allauth.socialaccount.models import SocialAccount
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone

from common.exceptions import PdlAPIException


PROVIDERS = {
    "google": {
        "authorize": "https://accounts.google.com/o/oauth2/v2/auth",
        "token": "https://oauth2.googleapis.com/token",
        "profile": "https://openidconnect.googleapis.com/v1/userinfo",
        "scope": "openid email profile",
    },
    "discord": {
        "authorize": "https://discord.com/oauth2/authorize",
        "token": "https://discord.com/api/oauth2/token",
        "profile": "https://discord.com/api/users/@me",
        "scope": "identify email",
    },
}


def _credentials(provider: str) -> tuple[str, str]:
    if provider == "google":
        return settings.GOOGLE_CLIENT_ID, settings.GOOGLE_CLIENT_SECRET
    if provider == "discord":
        return settings.DISCORD_CLIENT_ID, settings.DISCORD_CLIENT_SECRET
    raise PdlAPIException("Provedor de login inválido.", error_code="OAUTH_PROVIDER_INVALID")


def callback_url(provider: str) -> str:
    return f"{settings.FRONTEND_URL.rstrip('/')}/auth/callback/{provider}"


def begin_oauth(provider: str, mode: str, user) -> str:
    config = PROVIDERS.get(provider)
    client_id, client_secret = _credentials(provider)
    if not config or not client_id or not client_secret:
        raise PdlAPIException("Este provedor ainda não foi configurado.", error_code="OAUTH_NOT_CONFIGURED")
    if mode not in {"login", "link"}:
        raise PdlAPIException("Modo OAuth inválido.", error_code="OAUTH_MODE_INVALID")
    if mode == "link" and not user.is_authenticated:
        raise PdlAPIException("Entre na conta antes de conectá-la.", error_code="AUTHENTICATION_REQUIRED", status_code=401)

    state = secrets.token_urlsafe(32)
    cache.set(
        f"oauth-state:{state}",
        {"provider": provider, "mode": mode, "user_id": str(user.id) if user.is_authenticated else ""},
        timeout=600,
    )
    params = {
        "client_id": client_id,
        "redirect_uri": callback_url(provider),
        "response_type": "code",
        "scope": config["scope"],
        "state": state,
    }
    if provider == "google":
        params["prompt"] = "select_account"
    return f"{config['authorize']}?{urlencode(params)}"


def _request_json(url: str, *, data: dict | None = None, token: str = "") -> dict:
    body = urlencode(data).encode() if data is not None else None
    headers = {"Accept": "application/json", "User-Agent": "PDL-2.0"}
    if body is not None:
        headers["Content-Type"] = "application/x-www-form-urlencoded"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        with urlopen(Request(url, data=body, headers=headers), timeout=10) as response:
            return json.loads(response.read().decode())
    except (HTTPError, URLError, TimeoutError, ValueError) as exc:
        raise PdlAPIException(
            "Não foi possível validar a conta externa.",
            error_code="OAUTH_PROVIDER_ERROR",
            status_code=502,
        ) from exc


def _profile(provider: str, code: str) -> dict:
    config = PROVIDERS[provider]
    client_id, client_secret = _credentials(provider)
    token_data = _request_json(
        config["token"],
        data={
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": callback_url(provider),
        },
    )
    access_token = token_data.get("access_token", "")
    if not access_token:
        raise PdlAPIException("Código OAuth inválido ou expirado.", error_code="OAUTH_CODE_INVALID")
    return _request_json(config["profile"], token=access_token)


def _unique_username(profile: dict, email: str) -> str:
    User = get_user_model()
    raw = profile.get("preferred_username") or profile.get("global_name") or profile.get("username") or email.split("@", 1)[0]
    base = re.sub(r"[^A-Za-z0-9]", "", str(raw))[:16] or "jogador"
    if len(base) < 3:
        base = f"{base}pdl"[:16]
    candidate = base
    counter = 1
    while User.objects.filter(username__iexact=candidate).exists():
        suffix = str(counter)
        candidate = f"{base[:16 - len(suffix)]}{suffix}"
        counter += 1
    return candidate


def complete_oauth(provider: str, code: str, state: str):
    state_key = f"oauth-state:{state}"
    stored = cache.get(state_key)
    cache.delete(state_key)
    if not stored or stored.get("provider") != provider:
        raise PdlAPIException("A tentativa de login expirou. Tente novamente.", error_code="OAUTH_STATE_INVALID")

    profile = _profile(provider, code)
    raw_uid = profile.get("sub") if provider == "google" else profile.get("id")
    provider_uid = str(raw_uid).strip() if raw_uid is not None else ""
    email = str(profile.get("email", "")).strip().lower()
    verified = bool(profile.get("email_verified") if provider == "google" else profile.get("verified"))
    if not provider_uid or not email or not verified:
        raise PdlAPIException(
            "O provedor precisa fornecer um e-mail verificado.",
            error_code="OAUTH_EMAIL_UNVERIFIED",
        )

    User = get_user_model()
    social = SocialAccount.objects.filter(provider=provider, uid=provider_uid).select_related("user").first()
    if stored.get("mode") == "link":
        user = User.objects.filter(id=stored.get("user_id"), is_active=True).first()
        if not user:
            raise PdlAPIException("Sessão inválida para conexão.", error_code="AUTHENTICATION_REQUIRED", status_code=401)
        if social and social.user_id != user.pk:
            raise PdlAPIException("Essa conta externa já está conectada a outro usuário.", error_code="OAUTH_ALREADY_LINKED", status_code=409)
    elif social:
        user = social.user
    else:
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            display_name = str(profile.get("name") or profile.get("global_name") or profile.get("username") or "")[:80]
            user = User.objects.create_user(
                username=_unique_username(profile, email),
                email=email,
                display_name=display_name,
                password=None,
                is_email_verified=True,
                terms_accepted_at=timezone.now(),
            )

    if not user.is_active:
        raise PdlAPIException("Esta conta está desativada.", error_code="ACCOUNT_DISABLED", status_code=403)
    if not user.is_email_verified:
        user.is_email_verified = True
        user.save(update_fields=["is_email_verified", "updated_at"])
    SocialAccount.objects.update_or_create(
        provider=provider,
        uid=provider_uid,
        defaults={"user": user, "extra_data": profile},
    )
    return user, stored.get("mode") == "link"
