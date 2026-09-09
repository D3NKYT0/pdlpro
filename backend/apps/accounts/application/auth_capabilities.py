from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from django.conf import settings

from common.architecture.base import UseCase


@dataclass(frozen=True, slots=True)
class AuthCapabilitiesInput:
    """Consulta capacidades de autenticação e vínculos sociais da sessão."""

    user_id: UUID | None
    is_authenticated: bool


class GetAuthCapabilitiesUseCase(UseCase[AuthCapabilitiesInput, dict]):
    """Monta flags de auth e provedores OAuth conectados sem ORM na presentation."""

    def execute(self, data: AuthCapabilitiesInput) -> dict:
        from allauth.socialaccount.models import SocialAccount

        connected: list[str] = []
        if data.is_authenticated and data.user_id is not None:
            connected = list(
                SocialAccount.objects.filter(user__id=data.user_id).values_list(
                    "provider", flat=True
                )
            )
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
