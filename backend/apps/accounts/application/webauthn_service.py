from __future__ import annotations

import json
import secrets
from urllib.parse import urlparse

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from webauthn import (
    generate_authentication_options,
    generate_registration_options,
    verify_authentication_response,
    verify_registration_response,
)
from webauthn.helpers import base64url_to_bytes, bytes_to_base64url, options_to_json
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    PublicKeyCredentialDescriptor,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)

from apps.accounts.infrastructure.models import User, WebAuthnCredential

CHALLENGE_TTL = 300
CHALLENGE_PREFIX = "pdl:webauthn:"


class WebAuthnError(Exception):
    """Indica falha no fluxo de registro ou autenticação com passkey.

    A apresentação converte a mensagem em resposta de validação ao cliente.
    """

    pass


def _rp_id() -> str:
    return settings.WEBAUTHN_RP_ID or urlparse(settings.FRONTEND_URL).hostname or "localhost"


def _origins() -> list[str]:
    return settings.WEBAUTHN_ORIGINS or [settings.FRONTEND_URL.rstrip("/")]


def _store(payload: dict) -> str:
    state = secrets.token_urlsafe(32)
    cache.set(f"{CHALLENGE_PREFIX}{state}", payload, CHALLENGE_TTL)
    return state


def _pop(state: str) -> dict | None:
    key = f"{CHALLENGE_PREFIX}{state}"
    payload = cache.get(key)
    if payload:
        cache.delete(key)
    return payload


def begin_registration(user: User, nickname: str = "") -> dict:
    existing = [
        PublicKeyCredentialDescriptor(id=row.credential_id, transports=row.transports or None)
        for row in user.webauthn_credentials.all()
    ]
    options = generate_registration_options(
        rp_id=_rp_id(),
        rp_name=settings.WEBAUTHN_RP_NAME,
        user_id=user.id.bytes,
        user_name=user.username,
        user_display_name=user.display_name or user.username,
        exclude_credentials=existing,
        authenticator_selection=AuthenticatorSelectionCriteria(
            resident_key=ResidentKeyRequirement.PREFERRED,
            user_verification=UserVerificationRequirement.PREFERRED,
        ),
    )
    state = _store({"kind": "register", "uid": str(user.id), "challenge": bytes_to_base64url(options.challenge), "nickname": nickname[:64]})
    return {"options": json.loads(options_to_json(options)), "state": state}


def complete_registration(user: User, state: str, credential: dict, nickname: str = "") -> WebAuthnCredential:
    saved = _pop(state)
    if not saved or saved.get("kind") != "register" or saved.get("uid") != str(user.id):
        raise WebAuthnError("Desafio inválido ou expirado.")
    verified = verify_registration_response(
        credential=credential,
        expected_challenge=base64url_to_bytes(saved["challenge"]),
        expected_rp_id=_rp_id(),
        expected_origin=_origins(),
        require_user_verification=True,
    )
    return WebAuthnCredential.objects.create(
        user=user,
        credential_id=verified.credential_id,
        public_key=verified.credential_public_key,
        sign_count=verified.sign_count,
        transports=list(credential.get("response", {}).get("transports") or []),
        aaguid=str(verified.aaguid) if verified.aaguid else "",
        nickname=(nickname or saved.get("nickname") or "Chave de acesso")[:64],
    )


def begin_authentication(login: str = "") -> dict:
    allow = None
    uid = None
    if login.strip():
        query = {"email__iexact": login.strip()} if "@" in login else {"username__iexact": login.strip()}
        user = User.objects.filter(**query, is_active=True).first()
        allow = [] if not user else [PublicKeyCredentialDescriptor(id=row.credential_id, transports=row.transports or None) for row in user.webauthn_credentials.all()]
        uid = str(user.id) if user else None
    options = generate_authentication_options(
        rp_id=_rp_id(),
        allow_credentials=allow,
        user_verification=UserVerificationRequirement.PREFERRED,
    )
    state = _store({"kind": "login", "uid": uid, "challenge": bytes_to_base64url(options.challenge)})
    return {"options": json.loads(options_to_json(options)), "state": state}


def complete_authentication(state: str, credential: dict) -> User:
    saved = _pop(state)
    if not saved or saved.get("kind") != "login":
        raise WebAuthnError("Desafio inválido ou expirado.")
    raw_id = credential.get("rawId") or credential.get("id")
    row = WebAuthnCredential.objects.select_related("user").filter(credential_id=base64url_to_bytes(raw_id or "")).first()
    if not row or not row.user.is_active or (saved.get("uid") and saved["uid"] != str(row.user.id)):
        raise WebAuthnError("Credencial inválida.")
    verified = verify_authentication_response(
        credential=credential,
        expected_challenge=base64url_to_bytes(saved["challenge"]),
        expected_rp_id=_rp_id(),
        expected_origin=_origins(),
        credential_public_key=row.public_key,
        credential_current_sign_count=row.sign_count,
        require_user_verification=True,
    )
    row.sign_count = verified.new_sign_count
    row.last_used_at = timezone.now()
    row.save(update_fields=["sign_count", "last_used_at", "updated_at"])
    return row.user
