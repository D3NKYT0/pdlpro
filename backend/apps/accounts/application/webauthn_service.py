from __future__ import annotations

import json
import secrets
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse
from uuid import UUID

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
from webauthn.helpers.exceptions import WebAuthnException
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    AuthenticatorTransport,
    PublicKeyCredentialDescriptor,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)

from apps.accounts.domain.exceptions import WebAuthnError
from apps.accounts.domain.repositories import (
    IWebAuthnCredentialRepository,
    WebAuthnCredentialRecord,
)
from common.architecture.base import UseCase

CHALLENGE_TTL = 300
CHALLENGE_PREFIX = "pdl:webauthn:"


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


def _descriptor(row: Any) -> PublicKeyCredentialDescriptor:
    """Converte transports persistidos em JSON para os enums exigidos pelo SDK.

    Valores desconhecidos de navegadores futuros são ignorados; a credencial
    continua utilizável sem uma indicação de transporte.
    """
    supported = {transport.value for transport in AuthenticatorTransport}
    transports = [
        AuthenticatorTransport(value)
        for value in (getattr(row, "transports", None) or [])
        if isinstance(value, str) and value in supported
    ]
    credential_id = getattr(row, "credential_id", None)
    return PublicKeyCredentialDescriptor(
        id=bytes(credential_id),
        transports=transports or None,
    )


@dataclass(frozen=True, slots=True)
class BeginPasskeyRegistrationInput:
    """Dados de entrada de ``BeginPasskeyRegistrationUseCase.execute``."""

    user_id: UUID
    username: str
    display_name: str
    nickname: str = ""


class BeginPasskeyRegistrationUseCase(UseCase[BeginPasskeyRegistrationInput, dict]):
    """Gera o desafio WebAuthn de registro para o usuário autenticado."""

    def __init__(self, credentials: IWebAuthnCredentialRepository) -> None:
        self._credentials = credentials

    def execute(self, data: BeginPasskeyRegistrationInput) -> dict:
        existing = [_descriptor(row) for row in self._credentials.list_raw_for_user(data.user_id)]
        options = generate_registration_options(
            rp_id=_rp_id(),
            rp_name=settings.WEBAUTHN_RP_NAME,
            user_id=data.user_id.bytes,
            user_name=data.username,
            user_display_name=data.display_name or data.username,
            exclude_credentials=existing,
            authenticator_selection=AuthenticatorSelectionCriteria(
                resident_key=ResidentKeyRequirement.PREFERRED,
                user_verification=UserVerificationRequirement.PREFERRED,
            ),
        )
        state = _store(
            {
                "kind": "register",
                "uid": str(data.user_id),
                "challenge": bytes_to_base64url(options.challenge),
                "nickname": data.nickname[:64],
            }
        )
        return {"options": json.loads(options_to_json(options)), "state": state}


@dataclass(frozen=True, slots=True)
class CompletePasskeyRegistrationInput:
    """Dados de entrada de ``CompletePasskeyRegistrationUseCase.execute``."""

    user_id: UUID
    state: str
    credential: dict
    nickname: str = ""


class CompletePasskeyRegistrationUseCase(UseCase[CompletePasskeyRegistrationInput, WebAuthnCredentialRecord]):
    """Valida a resposta de registro e persiste a credencial passkey."""

    def __init__(self, credentials: IWebAuthnCredentialRepository) -> None:
        self._credentials = credentials

    def execute(self, data: CompletePasskeyRegistrationInput) -> WebAuthnCredentialRecord:
        saved = _pop(data.state)
        if not saved or saved.get("kind") != "register" or saved.get("uid") != str(data.user_id):
            raise WebAuthnError("Desafio inválido ou expirado.")
        try:
            verified = verify_registration_response(
                credential=data.credential,
                expected_challenge=base64url_to_bytes(saved["challenge"]),
                expected_rp_id=_rp_id(),
                expected_origin=_origins(),
                require_user_verification=True,
            )
        except WebAuthnException as exc:
            raise WebAuthnError("Não foi possível validar esta chave de acesso.") from exc
        return self._credentials.create(
            data.user_id,
            credential_id=verified.credential_id,
            public_key=verified.credential_public_key,
            sign_count=verified.sign_count,
            transports=list(data.credential.get("response", {}).get("transports") or []),
            aaguid=str(verified.aaguid) if verified.aaguid else "",
            nickname=(data.nickname or saved.get("nickname") or "Chave de acesso")[:64],
        )


@dataclass(frozen=True, slots=True)
class BeginPasskeyAuthenticationInput:
    """Dados de entrada de ``BeginPasskeyAuthenticationUseCase.execute``."""

    login: str = ""


class BeginPasskeyAuthenticationUseCase(UseCase[BeginPasskeyAuthenticationInput, dict]):
    """Gera o desafio WebAuthn de autenticação, opcionalmente restrito a um login."""

    def __init__(self, credentials: IWebAuthnCredentialRepository) -> None:
        self._credentials = credentials

    def execute(self, data: BeginPasskeyAuthenticationInput) -> dict:
        allow = None
        uid = None
        if data.login.strip():
            user = self._credentials.find_active_user_by_login(data.login)
            allow = [] if not user else [_descriptor(row) for row in self._credentials.list_raw_for_user(user.id)]
            uid = str(user.id) if user else None
        options = generate_authentication_options(
            rp_id=_rp_id(),
            allow_credentials=allow,
            user_verification=UserVerificationRequirement.PREFERRED,
        )
        state = _store({"kind": "login", "uid": uid, "challenge": bytes_to_base64url(options.challenge)})
        return {"options": json.loads(options_to_json(options)), "state": state}


@dataclass(frozen=True, slots=True)
class CompletePasskeyAuthenticationInput:
    """Dados de entrada de ``CompletePasskeyAuthenticationUseCase.execute``."""

    state: str
    credential: dict


class CompletePasskeyAuthenticationUseCase(UseCase[CompletePasskeyAuthenticationInput, Any]):
    """Valida a asserção WebAuthn e devolve o usuário ORM autenticado."""

    def __init__(self, credentials: IWebAuthnCredentialRepository) -> None:
        self._credentials = credentials

    def execute(self, data: CompletePasskeyAuthenticationInput) -> Any:
        saved = _pop(data.state)
        if not saved or saved.get("kind") != "login":
            raise WebAuthnError("Desafio inválido ou expirado.")
        raw_id = data.credential.get("rawId") or data.credential.get("id")
        found = self._credentials.find_by_credential_id(base64url_to_bytes(raw_id or ""))
        if (
            not found
            or not found[1].is_active
            or (saved.get("uid") and saved["uid"] != str(found[1].id))
        ):
            raise WebAuthnError("Credencial inválida.")
        record, user = found
        try:
            verified = verify_authentication_response(
                credential=data.credential,
                expected_challenge=base64url_to_bytes(saved["challenge"]),
                expected_rp_id=_rp_id(),
                expected_origin=_origins(),
                credential_public_key=record.public_key,
                credential_current_sign_count=record.sign_count,
                require_user_verification=True,
            )
        except WebAuthnException as exc:
            raise WebAuthnError("Não foi possível autenticar com esta chave.") from exc
        self._credentials.mark_used(
            record.id,
            sign_count=verified.new_sign_count,
            last_used_at=timezone.now(),
        )
        return user


@dataclass(frozen=True, slots=True)
class ListPasskeysInput:
    """Dados de entrada de ``ListPasskeysUseCase.execute``."""

    user_id: UUID


class ListPasskeysUseCase(UseCase[ListPasskeysInput, list[WebAuthnCredentialRecord]]):
    """Lista as credenciais passkey do usuário autenticado."""

    def __init__(self, credentials: IWebAuthnCredentialRepository) -> None:
        self._credentials = credentials

    def execute(self, data: ListPasskeysInput) -> list[WebAuthnCredentialRecord]:
        return self._credentials.list_for_user(data.user_id)


@dataclass(frozen=True, slots=True)
class DeletePasskeyInput:
    """Dados de entrada de ``DeletePasskeyUseCase.execute``."""

    user_id: UUID
    credential_id: UUID


class DeletePasskeyUseCase(UseCase[DeletePasskeyInput, bool]):
    """Remove uma credencial passkey limitada ao usuário da sessão."""

    def __init__(self, credentials: IWebAuthnCredentialRepository) -> None:
        self._credentials = credentials

    def execute(self, data: DeletePasskeyInput) -> bool:
        return self._credentials.delete_for_user(data.credential_id, data.user_id)


# Funções de módulo usadas pelos testes de fronteira criptográfica.
def begin_registration(user, nickname: str = "") -> dict:
    from apps.accounts.infrastructure.repositories import DjangoWebAuthnCredentialRepository

    return BeginPasskeyRegistrationUseCase(DjangoWebAuthnCredentialRepository()).execute(
        BeginPasskeyRegistrationInput(
            user_id=user.id,
            username=user.username,
            display_name=user.display_name or user.username,
            nickname=nickname,
        )
    )


def complete_registration(user, state: str, credential: dict, nickname: str = "") -> WebAuthnCredentialRecord:
    from apps.accounts.infrastructure.repositories import DjangoWebAuthnCredentialRepository

    return CompletePasskeyRegistrationUseCase(DjangoWebAuthnCredentialRepository()).execute(
        CompletePasskeyRegistrationInput(
            user_id=user.id,
            state=state,
            credential=credential,
            nickname=nickname,
        )
    )


def begin_authentication(login: str = "") -> dict:
    from apps.accounts.infrastructure.repositories import DjangoWebAuthnCredentialRepository

    return BeginPasskeyAuthenticationUseCase(DjangoWebAuthnCredentialRepository()).execute(
        BeginPasskeyAuthenticationInput(login=login)
    )


def complete_authentication(state: str, credential: dict):
    from apps.accounts.infrastructure.repositories import DjangoWebAuthnCredentialRepository

    return CompletePasskeyAuthenticationUseCase(DjangoWebAuthnCredentialRepository()).execute(
        CompletePasskeyAuthenticationInput(state=state, credential=credential)
    )
