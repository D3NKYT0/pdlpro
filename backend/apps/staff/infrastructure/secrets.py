"""Adaptadores de rotação de segredos: .env, reencrypt e jobs."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from django.conf import settings
from django.core.files.base import ContentFile
from django.db import transaction
from django.utils import timezone
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)

from apps.accounts.infrastructure.models import (
    DataExportLog,
    TwoFactorRecoveryCode,
    User,
)
from apps.staff.domain.secrets import (
    IGlobalSessionRevoker,
    ISealedDataReencryptor,
    ISecretRotationJobStore,
    ISecretsEnvStore,
)
from apps.staff.infrastructure.models import SecretRotationJob
from common.crypto import IFieldCipher, field_cipher_from_settings
from common.secrets_env import EnvFile, join_csv_values


class DjangoSecretsEnvStore(ISecretsEnvStore):
    """Grava o ``.env`` e espelha nos settings do processo atual."""

    def _env_file(self) -> EnvFile:
        explicit = str(getattr(settings, "PDL_ENV_FILE", "") or "").strip() or None
        return EnvFile.resolve(explicit)

    def is_writable(self) -> bool:
        if not bool(getattr(settings, "PDL_ALLOW_RUNTIME_SECRET_ROTATION", False)):
            return False
        path = self._env_file().path
        if path.is_file():
            return path.exists() and os_access_write(path)
        return os_access_write(path.parent)

    def apply_secret_key_rotation(self, *, new_key: str, fallbacks: list[str], rotated_at: str) -> None:
        self._env_file().write_many(
            {
                "SECRET_KEY": new_key,
                "SECRET_KEY_FALLBACKS": join_csv_values(fallbacks),
                "SECRET_KEY_ROTATED_AT": rotated_at,
            }
        )
        settings.SECRET_KEY = new_key
        settings.SECRET_KEY_FALLBACKS = list(fallbacks)
        settings.SECRET_KEY_ROTATED_AT = rotated_at

    def apply_secret_key_prune(self) -> list[str]:
        removed = list(getattr(settings, "SECRET_KEY_FALLBACKS", None) or [])
        self._env_file().write_many({"SECRET_KEY_FALLBACKS": ""})
        settings.SECRET_KEY_FALLBACKS = []
        return removed

    def apply_data_key_rotation(self, *, new_key: str, fallbacks: list[str], rotated_at: str) -> None:
        self._env_file().write_many(
            {
                "PDL_DATA_ENCRYPTION_KEY": new_key,
                "PDL_DATA_ENCRYPTION_KEY_FALLBACKS": join_csv_values(fallbacks),
                "PDL_DATA_ENCRYPTION_ROTATED_AT": rotated_at,
            }
        )
        settings.PDL_DATA_ENCRYPTION_KEY = new_key
        settings.PDL_DATA_ENCRYPTION_KEY_FALLBACKS = list(fallbacks)
        settings.PDL_DATA_ENCRYPTION_ROTATED_AT = rotated_at

    def apply_data_key_prune(self) -> list[str]:
        removed = list(getattr(settings, "PDL_DATA_ENCRYPTION_KEY_FALLBACKS", None) or [])
        self._env_file().write_many({"PDL_DATA_ENCRYPTION_KEY_FALLBACKS": ""})
        settings.PDL_DATA_ENCRYPTION_KEY_FALLBACKS = []
        return removed

    def apply_backup_key_rotation(self, *, new_key: str, fallbacks: list[str]) -> None:
        self._env_file().write_many(
            {
                "BACKUP_ENCRYPTION_KEY": new_key,
                "BACKUP_ENCRYPTION_KEY_FALLBACKS": join_csv_values(fallbacks),
            }
        )
        settings.BACKUP_ENCRYPTION_KEY = new_key
        settings.BACKUP_ENCRYPTION_KEY_FALLBACKS = list(fallbacks)


def os_access_write(path) -> bool:
    import os

    return os.access(path, os.W_OK)


class DjangoSealedDataReencryptor(ISealedDataReencryptor):
    """Regrava campos/arquivos selados com a chave Fernet primaria atual."""

    def __init__(self, cipher: IFieldCipher | None = None) -> None:
        self._cipher = cipher

    def _cipher_or_settings(self) -> IFieldCipher:
        return self._cipher or field_cipher_from_settings()

    def reencrypt(self) -> dict[str, int]:
        cipher = self._cipher_or_settings()
        totp = 0
        recovery = 0
        exports = 0
        with transaction.atomic():
            for user in User.objects.exclude(totp_secret="").iterator():
                stored = user.totp_secret or ""
                if not cipher.needs_reseal_text(stored) and not stored:
                    continue
                plain = cipher.unseal_text(stored)
                if not plain:
                    continue
                if cipher.needs_reseal_text(stored) or stored == plain:
                    user.totp_secret = cipher.seal_text(plain)
                    user.save(update_fields=["totp_secret", "updated_at"])
                    totp += 1
            for row in TwoFactorRecoveryCode.objects.all().iterator():
                stored = row.code_cipher or ""
                if not cipher.needs_reseal_text(stored):
                    continue
                digest = cipher.unseal_text(stored)
                if not digest:
                    continue
                row.code_cipher = cipher.seal_text(digest)
                row.save(update_fields=["code_cipher", "updated_at"])
                recovery += 1
            for export in DataExportLog.objects.exclude(export_file="").iterator():
                try:
                    with export.export_file.open("rb") as handle:
                        stored = handle.read()
                except FileNotFoundError:
                    continue
                if not cipher.needs_reseal_bytes(stored):
                    continue
                plain = cipher.unseal_bytes(stored)
                name = export.export_file.name
                export.export_file.save(name, ContentFile(cipher.seal_bytes(plain)), save=True)
                exports += 1
        return {"totp": totp, "recovery_codes": recovery, "lgpd_exports": exports}


class DjangoGlobalSessionRevoker(IGlobalSessionRevoker):
    """Coloca na blacklist todos os refresh tokens ainda válidos."""

    def revoke_all(self) -> int:
        now = timezone.now()
        count = 0
        with transaction.atomic():
            for token in OutstandingToken.objects.filter(expires_at__gt=now).iterator():
                _, created = BlacklistedToken.objects.get_or_create(token=token)
                if created:
                    count += 1
        return count


class DjangoSecretRotationJobStore(ISecretRotationJobStore):
    """ORM de ``SecretRotationJob``."""

    def _serialize(self, job: SecretRotationJob) -> dict[str, Any]:
        return {
            "id": str(job.id),
            "kind": job.kind,
            "status": job.status,
            "source": job.source,
            "restart_required": job.restart_required,
            "result": job.result or {},
            "error": job.error or "",
            "created_at": job.created_at.isoformat() if job.created_at else None,
            "applied_at": job.applied_at.isoformat() if job.applied_at else None,
            "actor_id": str(job.actor.id) if job.actor_id else None,
        }

    def create(
        self,
        *,
        kind: str,
        actor_id: UUID | None,
        source: str,
        confirmation: str = "",
    ) -> dict[str, Any]:
        from apps.accounts.infrastructure.models import User

        actor = User.objects.filter(id=actor_id).first() if actor_id else None
        job = SecretRotationJob.objects.create(
            kind=kind,
            status=SecretRotationJob.Status.PENDING,
            source=source,
            actor=actor,
            confirmation_domain=confirmation[:120],
        )
        return self._serialize(job)

    def mark(
        self,
        job_id: UUID,
        *,
        status: str,
        result: dict[str, Any] | None = None,
        error: str = "",
        restart_required: bool = False,
    ) -> dict[str, Any]:
        job = SecretRotationJob.objects.get(id=job_id)
        job.status = status
        job.result = result or {}
        job.error = error
        job.restart_required = restart_required
        if status == SecretRotationJob.Status.APPLIED:
            job.applied_at = timezone.now()
        job.save(
            update_fields=["status", "result", "error", "restart_required", "applied_at", "updated_at"]
        )
        return self._serialize(job)

    def get(self, job_id: UUID) -> dict[str, Any] | None:
        job = SecretRotationJob.objects.filter(id=job_id).first()
        return self._serialize(job) if job else None

    def list_pending(self) -> list[dict[str, Any]]:
        return [
            self._serialize(job)
            for job in SecretRotationJob.objects.filter(status=SecretRotationJob.Status.PENDING).order_by(
                "created_at"
            )[:50]
        ]

    def list_recent(self, *, limit: int = 20) -> list[dict[str, Any]]:
        return [
            self._serialize(job)
            for job in SecretRotationJob.objects.order_by("-created_at")[:limit]
        ]

    def has_pending_kind(self, kind: str) -> bool:
        return SecretRotationJob.objects.filter(
            kind=kind, status=SecretRotationJob.Status.PENDING
        ).exists()
