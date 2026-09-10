"""Adaptador de portabilidade e exclusão LGPD (infraestrutura)."""

from __future__ import annotations

import gzip
import hashlib
import json
import logging
import secrets
import uuid
from collections.abc import Mapping, Sequence
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any
from uuid import UUID

from allauth.socialaccount.models import SocialAccount
from django.conf import settings
from django.core import signing
from django.core.cache import cache
from django.core.files.base import ContentFile
from django.db import transaction
from django.urls import reverse
from django.utils import timezone
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)

from apps.accounts.domain.exceptions import (
    LgpdExportExpiredError,
    LgpdExportNotFoundError,
    LgpdExportPendingError,
    LgpdInvalidDeleteCodeError,
    UserNotFoundError,
)
from apps.accounts.domain.lgpd import (
    AccountDeletionResult,
    DataExportResult,
    DeleteCodeResult,
    ILgpdPrivacyService,
)
from apps.accounts.domain.mailer import IMailer
from apps.accounts.infrastructure.models import (
    AccountActionCode,
    DataExportLog,
    GamerProfile,
    RewardClaim,
    User,
    UserAchievement,
    WebAuthnCredential,
)

logger = logging.getLogger(__name__)

REDACTED = "[removido por solicitação LGPD]"
EXPORT_DOWNLOAD_SALT = "accounts.lgpd.export.download"
DELETE_CODE_MINUTES = 15


def _json_safe(value: Any) -> Any:
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, datetime | date):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, Mapping):
        return {str(k): _json_safe(v) for k, v in value.items()}
    if isinstance(value, Sequence) and not isinstance(value, str | bytes | bytearray):
        return [_json_safe(item) for item in value]
    return value


def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


def get_export_max_age_seconds() -> int:
    return int(getattr(settings, "LGPD_EXPORT_DOWNLOAD_MAX_AGE_SECONDS", 7 * 24 * 3600))


class DjangoLgpdPrivacyService(ILgpdPrivacyService):
    """Implementação ORM + e-mail da porta ``ILgpdPrivacyService``."""

    def __init__(self, mailer: IMailer) -> None:
        self._mailer = mailer

    def request_export(
        self,
        user_id: UUID,
        *,
        ip: str | None,
        user_agent: str,
    ) -> DataExportResult:
        user = User.objects.filter(id=user_id).first()
        if user is None:
            raise UserNotFoundError()

        existing = (
            DataExportLog.objects.filter(
                user=user,
                export_file__gt="",
                expires_at__gt=timezone.now(),
            )
            .order_by("-created_at")
            .first()
        )
        if existing:
            return DataExportResult(
                detail=(
                    "Já existe um pacote LGPD válido para sua conta. "
                    "Use o link abaixo para baixar o arquivo compactado."
                ),
                download_url=self._download_url(existing),
                expires_at=existing.expires_at,
                reused=True,
            )

        pending_key = f"lgpd_export_pending:{user.id}"
        pending_timeout = int(getattr(settings, "LGPD_EXPORT_PENDING_LOCK_SECONDS", 30 * 60))
        if not cache.add(pending_key, "1", timeout=pending_timeout):
            raise LgpdExportPendingError()

        try:
            export_log = DataExportLog(
                user=user,
                ip_address=ip,
                user_agent=(user_agent or "")[:512],
            )
            payload = self._build_portability_export(user)
            self._save_compressed_export(export_log, payload)
            export_log.save()
            download_url = self._download_url(export_log)
            self._mailer.send(
                user.email,
                "Seu pacote LGPD está pronto",
                (
                    "Olá,\n\n"
                    "Seu pacote de portabilidade (LGPD) está pronto em formato JSON compactado (.json.gz).\n\n"
                    f"Download: {download_url}\n\n"
                    "O link expira em alguns dias. Se você não solicitou esta exportação, ignore este e-mail.\n"
                ),
            )
            return DataExportResult(
                detail="Pacote LGPD gerado. Enviamos o link de download para o e-mail cadastrado.",
                download_url=download_url,
                expires_at=export_log.expires_at,
                reused=False,
            )
        finally:
            cache.delete(pending_key)

    def request_delete_code(self, user_id: UUID) -> DeleteCodeResult:
        user = User.objects.filter(id=user_id, is_active=True).first()
        if user is None:
            raise UserNotFoundError()

        plain = f"{secrets.randbelow(1_000_000):06d}"
        AccountActionCode.objects.filter(
            user=user,
            type=AccountActionCode.CodeType.LGPD_DELETE,
            is_used=False,
        ).update(is_used=True)
        AccountActionCode.objects.create(
            user=user,
            code_hash=_hash_code(plain),
            type=AccountActionCode.CodeType.LGPD_DELETE,
            expires_at=timezone.now() + timedelta(minutes=DELETE_CODE_MINUTES),
        )
        self._mailer.send(
            user.email,
            "Código para exclusão da conta",
            (
                "Olá,\n\n"
                f"Seu código para confirmar a exclusão da conta no painel é: {plain}\n\n"
                f"Ele expira em {DELETE_CODE_MINUTES} minutos. "
                "Se você não solicitou a exclusão, ignore este e-mail e altere sua senha.\n"
            ),
        )
        return DeleteCodeResult(
            detail=(
                "Código de confirmação enviado para o e-mail cadastrado. "
                f"Ele expira em {DELETE_CODE_MINUTES} minutos."
            )
        )

    def delete_account(self, user_id: UUID, code: str) -> AccountDeletionResult:
        user = User.objects.filter(id=user_id, is_active=True).first()
        if user is None:
            raise UserNotFoundError()
        if not self._validate_delete_code(user, code):
            raise LgpdInvalidDeleteCodeError()
        self._anonymize(user)
        return AccountDeletionResult(
            detail="Conta anonimizada com sucesso. Os dados pessoais foram removidos."
        )

    def resolve_export_download(self, token: str) -> DataExportLog:
        try:
            payload = signing.loads(
                token,
                salt=EXPORT_DOWNLOAD_SALT,
                max_age=get_export_max_age_seconds(),
            )
        except signing.SignatureExpired as exc:
            raise LgpdExportExpiredError() from exc
        except (signing.BadSignature, KeyError, ValueError, TypeError) as exc:
            raise LgpdExportNotFoundError() from exc

        export_log = (
            DataExportLog.objects.select_related("user")
            .filter(id=payload.get("export_id"), user__id=payload.get("user_id"))
            .first()
        )
        if export_log is None or not export_log.export_file:
            raise LgpdExportNotFoundError()
        if export_log.expires_at and export_log.expires_at < timezone.now():
            raise LgpdExportExpiredError()
        return export_log

    def mark_export_downloaded(self, export_log: DataExportLog) -> None:
        export_log.downloaded_at = timezone.now()
        export_log.save(update_fields=["downloaded_at", "updated_at"])

    def _download_url(self, export_log: DataExportLog) -> str:
        token = signing.dumps(
            {"export_id": str(export_log.id), "user_id": str(export_log.user.id)},
            salt=EXPORT_DOWNLOAD_SALT,
        )
        path = reverse("shared-lgpd-export-download", kwargs={"token": token})
        api_base = getattr(settings, "API_PUBLIC_URL", "").rstrip("/")
        if api_base:
            return f"{api_base}{path}"
        frontend = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
        # Em desenvolvimento o proxy Vite encaminha /api → backend.
        return f"{frontend}{path}"

    def _save_compressed_export(self, export_log: DataExportLog, payload: dict[str, Any]) -> None:
        stamp = str(payload.get("exported_at", "")).replace(":", "-").split(".")[0] or "export"
        filename = f"pdl-lgpd-{stamp}.json.gz"
        compressed = gzip.compress(
            json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8"),
            compresslevel=6,
        )
        export_log.export_file.save(filename, ContentFile(compressed), save=False)
        export_log.file_size_bytes = len(compressed)
        export_log.expires_at = timezone.now() + timedelta(seconds=get_export_max_age_seconds())

    def _build_portability_export(self, user: User) -> dict[str, Any]:
        profile = GamerProfile.objects.filter(user=user).first()
        social = list(
            SocialAccount.objects.filter(user=user).values("provider", "uid", "date_joined", "extra_data")
        )
        for row in social:
            extra = row.get("extra_data") or {}
            if isinstance(extra, dict):
                row["extra_data"] = {
                    k: v
                    for k, v in extra.items()
                    if k.lower() not in {"email", "name", "first_name", "last_name", "picture"}
                }
        return _json_safe(
            {
                "exported_at": timezone.now().isoformat(),
                "user": {
                    "id": str(user.id),
                    "username": user.username,
                    "email": user.email,
                    "display_name": user.display_name,
                    "bio": user.bio,
                    "role": user.role,
                    "is_email_verified": user.is_email_verified,
                    "is_2fa_enabled": user.is_2fa_enabled,
                    "fichas": user.fichas,
                    "terms_accepted_at": user.terms_accepted_at,
                    "terms_and_privacy_version": user.terms_and_privacy_version,
                    "created_at": user.created_at,
                    "updated_at": user.updated_at,
                },
                "gamer_profile": (
                    {"xp": profile.xp, "level": profile.level} if profile else None
                ),
                "social_accounts": social,
                "passkeys": list(
                    WebAuthnCredential.objects.filter(user=user).values(
                        "id", "nickname", "created_at", "last_used_at"
                    )
                ),
                "achievements": list(
                    UserAchievement.objects.filter(user=user).values(
                        "achievement__code",
                        "achievement__name",
                        "created_at",
                    )
                ),
                "reward_claims": list(
                    RewardClaim.objects.filter(user=user).values(
                        "reward__kind",
                        "reward__reference",
                        "reward__item_name",
                        "created_at",
                    )
                ),
                "data_export_history": list(
                    DataExportLog.objects.filter(user=user).values(
                        "id", "ip_address", "created_at", "expires_at", "file_size_bytes"
                    )
                ),
            }
        )

    def _validate_delete_code(self, user: User, code: str) -> bool:
        cleaned = (code or "").strip()
        if len(cleaned) != 6 or not cleaned.isdigit():
            return False
        row = (
            AccountActionCode.objects.filter(
                user=user,
                type=AccountActionCode.CodeType.LGPD_DELETE,
                is_used=False,
                expires_at__gt=timezone.now(),
                code_hash=_hash_code(cleaned),
            )
            .order_by("-created_at")
            .first()
        )
        if row is None:
            return False
        row.is_used = True
        row.save(update_fields=["is_used"])
        return True

    @transaction.atomic
    def _anonymize(self, user: User) -> None:
        anon_suffix = uuid.uuid4().hex[:12]
        if user.avatar:
            try:
                user.avatar.delete(save=False)
            except Exception as exc:  # noqa: BLE001
                logger.warning("Falha ao remover avatar LGPD user=%s: %s", user.id, exc)

        user.email = f"anon-{anon_suffix}@anonymized.local"
        user.username = f"anon{anon_suffix[:12]}"
        user.display_name = "Usuário anonimizado"
        user.bio = ""
        user.avatar = None
        user.is_active = False
        user.is_email_verified = False
        user.is_2fa_enabled = False
        user.totp_secret = ""
        user.terms_accepted_ip = None
        user.terms_accepted_user_agent = REDACTED
        user.set_unusable_password()
        user.save()

        WebAuthnCredential.objects.filter(user=user).delete()
        SocialAccount.objects.filter(user=user).delete()
        AccountActionCode.objects.filter(user=user).delete()

        for token in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=token)
