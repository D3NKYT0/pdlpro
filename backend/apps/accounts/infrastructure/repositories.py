from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.db import transaction
from django.utils import timezone
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed, TokenError
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.domain.entities import UserEntity
from apps.accounts.domain.exceptions import SessionAuthenticationError, SessionNotFoundError
from apps.accounts.domain.repositories import (
    ISessionStore,
    IUserRepository,
    IWebAuthnCredentialRepository,
    SessionRecord,
    TotpState,
    WebAuthnCredentialRecord,
)
from apps.accounts.infrastructure.models import WebAuthnCredential
from common.architecture.exceptions import ValidationDomainError

User = get_user_model()


class DjangoUserRepository(IUserRepository):
    """Adaptador Django de ``IUserRepository`` para consulta, criação, credenciais e atualização de
    usuários do painel.

    Concentra consultas e escritas ORM da porta. Prefira resolver a interface pelo container; ao
    combinar alterações em uma operação de negócio, o chamador deve delimitar a transação com
    UnitOfWork.
    """

    def _to_entity(self, user) -> UserEntity:
        avatar_url = user.avatar.url if user.avatar else None
        return UserEntity(
            id=user.id,
            username=user.username,
            email=user.email,
            display_name=user.display_name or user.username,
            bio=user.bio,
            role=user.role,
            is_email_verified=user.is_email_verified,
            fichas=user.fichas,
            avatar_url=avatar_url,
            is_2fa_enabled=user.is_2fa_enabled,
            is_staff=bool(user.is_staff),
            is_superuser=bool(user.is_superuser),
            is_staff_member=bool(user.is_staff_member),
            has_usable_password=user.has_usable_password(),
        )

    def get_by_id(self, user_id: UUID) -> UserEntity | None:
        user = User.objects.filter(id=user_id).first()
        return self._to_entity(user) if user else None

    def get_by_username(self, username: str) -> UserEntity | None:
        user = User.objects.filter(username__iexact=username).first()
        return self._to_entity(user) if user else None

    def get_by_email(self, email: str) -> UserEntity | None:
        user = User.objects.filter(email__iexact=email).first()
        return self._to_entity(user) if user else None

    def get_by_login(self, login: str) -> UserEntity | None:
        if "@" in login:
            return self.get_by_email(login)
        return self.get_by_username(login)

    def exists_username(self, username: str) -> bool:
        return User.objects.filter(username__iexact=username).exists()

    def exists_email(self, email: str) -> bool:
        return User.objects.filter(email__iexact=email).exists()

    def create(self, *, username: str, email: str, password: str, display_name: str = "") -> UserEntity:
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            display_name=display_name,
        )
        return self._to_entity(user)

    def check_password(self, user_id: UUID, password: str) -> bool:
        user = User.objects.filter(id=user_id).first()
        return bool(user and user.check_password(password))

    def update_profile(
        self,
        user_id: UUID,
        *,
        display_name: str | None,
        bio: str | None,
        avatar: object | None = None,
    ) -> UserEntity:
        user = User.objects.get(id=user_id)
        update_fields = ["updated_at"]
        if display_name is not None:
            user.display_name = display_name
            update_fields.append("display_name")
        if bio is not None:
            user.bio = bio
            update_fields.append("bio")
        if avatar is not None:
            user.avatar = avatar
            update_fields.append("avatar")
        user.save(update_fields=update_fields)
        return self._to_entity(user)

    def mark_email_verified(self, user_id: UUID) -> UserEntity:
        user = User.objects.get(id=user_id)
        user.is_email_verified = True
        user.save(update_fields=["is_email_verified", "updated_at"])
        return self._to_entity(user)

    def set_password(self, user_id: UUID, password: str) -> None:
        user = User.objects.get(id=user_id)
        user.set_password(password)
        user.save(update_fields=["password", "updated_at"])

    def has_usable_password(self, user_id: UUID) -> bool:
        user = User.objects.filter(id=user_id).first()
        return bool(user and user.has_usable_password())

    def update_username(self, user_id: UUID, username: str) -> UserEntity:
        user = User.objects.get(id=user_id)
        user.username = username
        user.save(update_fields=["username", "updated_at"])
        return self._to_entity(user)

    def accept_terms(self, user_id: UUID, version: str) -> UserEntity:
        user = User.objects.get(id=user_id)
        user.terms_accepted_at = timezone.now()
        user.terms_and_privacy_version = version
        user.save(update_fields=["terms_accepted_at", "terms_and_privacy_version", "updated_at"])
        return self._to_entity(user)

    def get_totp_state(self, user_id: UUID) -> TotpState | None:
        user = User.objects.filter(id=user_id).first()
        if user is None:
            return None
        return TotpState(
            user_id=user.id,
            username=user.username,
            is_2fa_enabled=bool(user.is_2fa_enabled),
            totp_secret=user.totp_secret or "",
            is_active=bool(user.is_active),
        )

    def set_totp_secret(self, user_id: UUID, secret: str) -> None:
        user = User.objects.get(id=user_id)
        user.totp_secret = secret
        user.save(update_fields=["totp_secret", "updated_at"])

    def enable_2fa(self, user_id: UUID) -> None:
        user = User.objects.get(id=user_id)
        user.is_2fa_enabled = True
        user.save(update_fields=["is_2fa_enabled", "updated_at"])

    def disable_2fa(self, user_id: UUID) -> None:
        user = User.objects.get(id=user_id)
        user.is_2fa_enabled = False
        user.totp_secret = ""
        user.save(update_fields=["is_2fa_enabled", "totp_secret", "updated_at"])

    def make_password_reset_token(self, user_id: UUID) -> str | None:
        user = User.objects.filter(id=user_id).first()
        if user is None:
            return None
        return f"{user.id}:{default_token_generator.make_token(user)}"

    def consume_password_reset_token(self, raw_token: str, password: str) -> bool:
        try:
            uid, token = raw_token.split(":", 1)
            user_id = UUID(uid)
        except (ValueError, AttributeError):
            return False
        with transaction.atomic():
            user = User.objects.select_for_update().filter(id=user_id).first()
            if user is None or not default_token_generator.check_token(user, token):
                return False
            user.set_password(password)
            user.save(update_fields=["password", "updated_at"])
        return True


class DjangoSessionStore(ISessionStore):
    """Adaptador SimpleJWT/ORM de ``ISessionStore`` para rotação e revogação de sessões."""

    def rotate_refresh(self, raw: str) -> Any:
        try:
            original = RefreshToken(raw)
            with transaction.atomic():
                User.objects.select_for_update().get(id=original[api_settings.USER_ID_CLAIM])
                refresh = RefreshToken(raw)
                user = JWTAuthentication().get_user(refresh)
                refresh.blacklist()
                return RefreshToken.for_user(user)
        except (
            TokenError,
            AuthenticationFailed,
            User.DoesNotExist,
            ValueError,
            TypeError,
            KeyError,
        ) as exc:
            raise SessionAuthenticationError() from exc

    def revoke_refresh(self, raw: str, user_id: UUID) -> None:
        if not raw:
            return
        try:
            refresh = RefreshToken(raw)
        except TokenError:
            return
        if str(refresh[api_settings.USER_ID_CLAIM]) != str(user_id):
            raise SessionAuthenticationError("Refresh token não pertence à sessão.")
        with transaction.atomic():
            User.objects.select_for_update().get(id=user_id)
            refresh.blacklist()

    def _active_outstanding(self, user):
        blacklisted_ids = BlacklistedToken.objects.filter(token__user=user).values_list(
            "token_id", flat=True
        )
        return (
            OutstandingToken.objects.filter(user=user, expires_at__gt=timezone.now())
            .exclude(id__in=blacklisted_ids)
            .order_by("-created_at")
        )

    def list_sessions(self, user_id: UUID, *, current_jti: str | None = None) -> list[SessionRecord]:
        user = User.objects.get(id=user_id)
        return [
            SessionRecord(
                id=row.jti,
                created_at=row.created_at,
                expires_at=row.expires_at,
                current=bool(current_jti) and row.jti == current_jti,
            )
            for row in self._active_outstanding(user)
        ]

    def revoke_session(self, user_id: UUID, jti: str, *, current_jti: str | None = None) -> bool:
        if not jti:
            raise ValidationDomainError("Informe a sessão.", details={"id": "Informe a sessão."})
        with transaction.atomic():
            user = User.objects.select_for_update().get(id=user_id)
            try:
                row = OutstandingToken.objects.select_for_update().get(user=user, jti=jti)
            except OutstandingToken.DoesNotExist as exc:
                raise SessionNotFoundError() from exc
            if row.expires_at <= timezone.now():
                raise SessionNotFoundError()
            if BlacklistedToken.objects.filter(token=row).exists():
                raise SessionNotFoundError()
            BlacklistedToken.objects.get_or_create(token=row)
        return bool(current_jti) and jti == current_jti

    def revoke_other_sessions(self, user_id: UUID, *, current_jti: str) -> int:
        if not current_jti:
            raise ValidationDomainError(
                "Sessão atual indisponível para preservar.",
                details={"detail": "Sessão atual indisponível para preservar."},
            )
        revoked = 0
        with transaction.atomic():
            user = User.objects.select_for_update().get(id=user_id)
            for row in self._active_outstanding(user).select_for_update():
                if row.jti == current_jti:
                    continue
                _, created = BlacklistedToken.objects.get_or_create(token=row)
                if created:
                    revoked += 1
        return revoked


class DjangoWebAuthnCredentialRepository(IWebAuthnCredentialRepository):
    """Adaptador ORM de ``IWebAuthnCredentialRepository``."""

    def _to_record(self, row: WebAuthnCredential) -> WebAuthnCredentialRecord:
        return WebAuthnCredentialRecord(
            id=row.id,
            user_id=row.user.id,
            credential_id=bytes(row.credential_id),
            public_key=bytes(row.public_key),
            sign_count=row.sign_count,
            transports=list(row.transports or []),
            aaguid=row.aaguid or "",
            nickname=row.nickname or "",
            created_at=row.created_at,
            last_used_at=row.last_used_at,
        )

    def list_for_user(self, user_id: UUID) -> list[WebAuthnCredentialRecord]:
        return [
            self._to_record(row)
            for row in WebAuthnCredential.objects.select_related("user").filter(user__id=user_id)
        ]

    def list_raw_for_user(self, user_id: UUID) -> list[Any]:
        return list(WebAuthnCredential.objects.filter(user__id=user_id))

    def create(
        self,
        user_id: UUID,
        *,
        credential_id: bytes,
        public_key: bytes,
        sign_count: int,
        transports: list,
        aaguid: str,
        nickname: str,
    ) -> WebAuthnCredentialRecord:
        user = User.objects.get(id=user_id)
        row = WebAuthnCredential.objects.create(
            user=user,
            credential_id=credential_id,
            public_key=public_key,
            sign_count=sign_count,
            transports=transports,
            aaguid=aaguid,
            nickname=nickname,
        )
        return self._to_record(row)

    def find_by_credential_id(self, credential_id: bytes) -> tuple[WebAuthnCredentialRecord, Any] | None:
        row = WebAuthnCredential.objects.select_related("user").filter(credential_id=credential_id).first()
        if row is None:
            return None
        return self._to_record(row), row.user

    def mark_used(self, credential_pk: UUID, *, sign_count: int, last_used_at: datetime) -> None:
        WebAuthnCredential.objects.filter(id=credential_pk).update(
            sign_count=sign_count,
            last_used_at=last_used_at,
            updated_at=timezone.now(),
        )

    def delete_for_user(self, credential_id: UUID, user_id: UUID) -> bool:
        deleted, _ = WebAuthnCredential.objects.filter(id=credential_id, user__id=user_id).delete()
        return bool(deleted)

    def find_active_user_by_login(self, login: str) -> Any | None:
        query = {"email__iexact": login.strip()} if "@" in login else {"username__iexact": login.strip()}
        return User.objects.filter(**query, is_active=True).first()
