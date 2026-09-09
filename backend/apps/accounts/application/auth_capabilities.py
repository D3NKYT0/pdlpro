from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from django.conf import settings

from apps.accounts.domain.repositories import ISocialAccountRepository
from common.architecture.base import UseCase


@dataclass(frozen=True, slots=True)
class AuthCapabilitiesInput:
    """Consulta capacidades de autenticação e vínculos sociais da sessão."""

    user_id: UUID | None
    is_authenticated: bool


class GetAuthCapabilitiesUseCase(UseCase[AuthCapabilitiesInput, dict]):
    """Monta flags de auth e provedores OAuth conectados sem ORM na presentation."""

    def __init__(self, social: ISocialAccountRepository) -> None:
        self._social = social

    def execute(self, data: AuthCapabilitiesInput) -> dict:
        connected: list[str] = []
        if data.is_authenticated and data.user_id is not None:
            connected = self._social.list_providers_for_user(data.user_id)
        return {
            "passkeys": True,
            "two_factor": True,
            "email_verification": True,
            "captcha": settings.HCAPTCHA_ENABLED,
            "hcaptcha_site_key": settings.HCAPTCHA_SITE_KEY,
            "google": bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET),
            "discord": bool(
                settings.DISCORD_CLIENT_ID and settings.DISCORD_CLIENT_SECRET
            ),
            "connected_providers": connected,
        }
