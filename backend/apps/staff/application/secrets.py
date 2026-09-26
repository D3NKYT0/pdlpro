"""Casos de uso de status e rotação operacional de segredos."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from django.conf import settings
from django.utils import timezone
from django.utils.translation import gettext as _

from apps.staff.domain.secrets import (
    IGlobalSessionRevoker,
    ISealedDataReencryptor,
    ISecretRotationJobStore,
    ISecretsEnvStore,
    SecretActionResult,
    SecretFingerprint,
    SecretsStatus,
)
from common.architecture.base import UseCase
from common.architecture.exceptions import ValidationDomainError
from common.secrets_env import (
    MAX_DATA_FALLBACKS,
    MAX_SECRET_FALLBACKS,
    fingerprint,
    generate_fernet_key,
    generate_secret_key,
    parse_iso,
    push_fallback,
    utc_now_iso,
)

KIND_ROTATE_SECRET = "rotate_secret_key"
KIND_PRUNE_SECRET = "prune_secret_fallbacks"
KIND_ROTATE_DATA = "rotate_data_encryption_key"
KIND_PRUNE_DATA = "prune_data_fallbacks"
KIND_ROTATE_BACKUP = "rotate_backup_encryption_key"
KIND_REENCRYPT = "reencrypt_sealed_data"
KIND_REVOKE_SESSIONS = "revoke_all_sessions"

APPLYABLE_KINDS = {
    KIND_ROTATE_SECRET,
    KIND_PRUNE_SECRET,
    KIND_ROTATE_DATA,
    KIND_PRUNE_DATA,
    KIND_ROTATE_BACKUP,
    KIND_REENCRYPT,
    KIND_REVOKE_SESSIONS,
}

PROCESS_BOOT_TIME = timezone.now()


def _is_job_restart_pending(job: dict[str, Any], boot_time: Any = None) -> bool:
    if not job.get("restart_required"):
        return False
    applied_at_str = job.get("applied_at")
    if not applied_at_str:
        return True
    try:
        applied_at = datetime.fromisoformat(applied_at_str)
        if applied_at.tzinfo is None:
            applied_at = applied_at.replace(tzinfo=UTC)
        current_boot = boot_time or PROCESS_BOOT_TIME
        return applied_at > current_boot
    except Exception:  # noqa: BLE001
        return True


def _domain_confirmation() -> str:
    hosts = getattr(settings, "ALLOWED_HOSTS", None) or []
    preferred: list[str] = []
    local_fallback: list[str] = []
    skip = {"*", "testserver", ".localhost"}
    for host in hosts:
        value = str(host or "").strip().lower()
        if not value or value in skip or value.startswith("."):
            continue
        if value in {"localhost", "127.0.0.1"}:
            local_fallback.append(value)
        else:
            preferred.append(value)
    if preferred:
        return preferred[0]
    if local_fallback:
        return local_fallback[0]
    domain = str(getattr(settings, "DOMAIN", "") or "").strip()
    if domain:
        return domain
    return "localhost"


def _require_confirmation(provided: str) -> None:
    expected = _domain_confirmation()
    if (provided or "").strip() != expected:
        raise ValidationDomainError(
            _("Confirmação inválida. Digite exactamente: %(value)s") % {"value": expected}
        )


def _stale(rotated_at: str | None, ttl_days: int, fallback_count: int) -> bool:
    if fallback_count <= 0 or ttl_days <= 0:
        return False
    parsed = parse_iso(rotated_at)
    if parsed is None:
        return fallback_count > 0
    return timezone.now() - parsed >= timedelta(days=ttl_days)


def _secret_level(
    *,
    present: bool,
    stale: bool,
    required_in_production: bool,
    debug: bool,
) -> str:
    if stale:
        return "attention"
    if present:
        return "ok"
    if required_in_production and not debug:
        return "action"
    return "optional"


class GetSecretsStatusUseCase(UseCase[None, SecretsStatus]):
    """Monta o painel de status sem expor valores em claro."""

    def __init__(self, jobs: ISecretRotationJobStore) -> None:
        self._jobs = jobs

    def execute(self, data: None = None) -> SecretsStatus:
        ttl = int(getattr(settings, "SECRET_KEY_FALLBACK_TTL_DAYS", 7) or 7)
        debug = bool(getattr(settings, "DEBUG", False))
        secret_fallbacks = list(getattr(settings, "SECRET_KEY_FALLBACKS", None) or [])
        data_fallbacks = list(getattr(settings, "PDL_DATA_ENCRYPTION_KEY_FALLBACKS", None) or [])
        backup_fallbacks = list(getattr(settings, "BACKUP_ENCRYPTION_KEY_FALLBACKS", None) or [])
        secret = str(getattr(settings, "SECRET_KEY", "") or "")
        data_key = str(getattr(settings, "PDL_DATA_ENCRYPTION_KEY", "") or "")
        hmac_key = str(getattr(settings, "PDL_DATA_HMAC_KEY", "") or "")
        backup = str(getattr(settings, "BACKUP_ENCRYPTION_KEY", "") or "")
        redis = ""
        try:
            import os
            from urllib.parse import urlparse

            redis_target = str(getattr(settings, "REDIS_URL", "") or "")
            if not redis_target:
                caches = getattr(settings, "CACHES", {}) or {}
                redis_target = str(caches.get("default", {}).get("LOCATION", "") or "")
            if not redis_target:
                redis_target = os.environ.get("REDIS_URL", "")

            parsed = urlparse(redis_target)
            redis = parsed.password or str(getattr(settings, "REDIS_PASSWORD", "") or "")
            if not redis:
                redis = os.environ.get("REDIS_PASSWORD", "")
        except Exception:  # noqa: BLE001
            redis = ""

        # Em DEBUG sem Fernet configurada, o adaptador deriva da SECRET_KEY.
        data_effective = data_key
        data_derived = False
        if not data_effective and debug and secret:
            from common.crypto import derive_development_fernet_key

            data_effective = derive_development_fernet_key(secret)
            data_derived = True

        secret_rotated = str(getattr(settings, "SECRET_KEY_ROTATED_AT", "") or "") or None
        data_rotated = str(getattr(settings, "PDL_DATA_ENCRYPTION_ROTATED_AT", "") or "") or None
        secret_stale = _stale(secret_rotated, ttl, len(secret_fallbacks))
        data_stale = _stale(data_rotated, ttl, len(data_fallbacks))
        pending = self._jobs.list_pending()
        restart = any(_is_job_restart_pending(job) for job in self._jobs.list_recent(limit=5))

        secrets = (
            SecretFingerprint(
                name="SECRET_KEY",
                fingerprint=fingerprint(secret) if secret else "",
                present=bool(secret),
                level=_secret_level(
                    present=bool(secret), stale=secret_stale, required_in_production=True, debug=debug
                ),
                fallback_count=len(secret_fallbacks),
                rotated_at=secret_rotated,
                stale_fallbacks=secret_stale,
                notes=(
                    (_("Fallbacks ativos — considere prune após o TTL"),)
                    if secret_stale
                    else ((_("Soft-rotate disponível via SECRET_KEY_FALLBACKS"),) if secret else ())
                ),
            ),
            SecretFingerprint(
                name="PDL_DATA_ENCRYPTION_KEY",
                fingerprint=fingerprint(data_effective) if data_effective else "",
                present=bool(data_effective),
                level=_secret_level(
                    present=bool(data_effective),
                    stale=data_stale,
                    required_in_production=True,
                    debug=debug,
                ),
                fallback_count=len(data_fallbacks),
                rotated_at=data_rotated,
                stale_fallbacks=data_stale,
                notes=(
                    (_("Derivada da SECRET_KEY no DEBUG — configure Fernet própria em produção"),)
                    if data_derived
                    else (
                        (_("MultiFernet: regrave dados antes de remover fallbacks"),)
                        if data_effective
                        else (_("Obrigatória em produção para TOTP/LGPD"),)
                    )
                ),
            ),
            SecretFingerprint(
                name="PDL_DATA_HMAC_KEY",
                fingerprint=fingerprint(hmac_key) if hmac_key else "",
                present=bool(hmac_key),
                level=_secret_level(
                    present=bool(hmac_key),
                    stale=False,
                    required_in_production=True,
                    debug=debug,
                ),
                notes=(
                    (_("Estável; não rotaciona com a Fernet"),)
                    if hmac_key
                    else (
                        (_("Sem HMAC dedicado — recovery usa derivação da Fernet"),)
                        if debug
                        else (_("Gere no configure-production para recovery estável"),)
                    )
                ),
            ),
            SecretFingerprint(
                name="BACKUP_ENCRYPTION_KEY",
                fingerprint=fingerprint(backup) if backup else "",
                present=bool(backup),
                level=_secret_level(
                    present=bool(backup),
                    stale=False,
                    required_in_production=True,
                    debug=debug,
                ),
                fallback_count=len(backup_fallbacks),
                notes=(
                    (_("Fallbacks só para decifrar dumps antigos"),)
                    if backup
                    else (
                        (_("Opcional no desenvolvimento — dumps saem em claro"),)
                        if debug
                        else (_("Obrigatória em produção para cifrar backups"),)
                    )
                ),
            ),
            SecretFingerprint(
                name="REDIS_PASSWORD",
                fingerprint=fingerprint(redis) if redis else "",
                present=bool(redis),
                level=_secret_level(
                    present=bool(redis),
                    stale=False,
                    required_in_production=True,
                    debug=debug,
                ),
                notes=(
                    (_("Somente via configure-production na máquina"),)
                    if redis
                    else (
                        (_("Opcional no desenvolvimento local"),)
                        if debug
                        else (_("Obrigatória no Compose de produção"),)
                    )
                ),
            ),
        )
        action_count = sum(1 for item in secrets if item.level == "action")
        attention_count = sum(1 for item in secrets if item.level == "attention")
        if restart:
            attention_count += 1
        if pending:
            attention_count += 1

        return SecretsStatus(
            runtime_rotation_enabled=bool(getattr(settings, "PDL_ALLOW_RUNTIME_SECRET_ROTATION", False)),
            restart_required=restart,
            auto_rotate_days=int(getattr(settings, "SECRET_KEY_AUTO_ROTATE_DAYS", 0) or 0),
            fallback_ttl_days=ttl,
            confirmation_domain=_domain_confirmation(),
            action_count=action_count,
            attention_count=attention_count,
            secrets=secrets,
            pending_jobs=tuple(pending),
            recent_jobs=tuple(self._jobs.list_recent()),
        )

@dataclass(frozen=True, slots=True)
class RequestSecretActionInput:
    kind: str
    actor_id: UUID | None
    confirmation: str
    source: str = "panel"
    apply_now: bool = True


class RequestSecretActionUseCase(UseCase[RequestSecretActionInput, SecretActionResult]):
    """Valida step-up, cria o job e aplica quando a política permitir."""

    def __init__(
        self,
        jobs: ISecretRotationJobStore,
        env_store: ISecretsEnvStore,
        reencryptor: ISealedDataReencryptor,
        sessions: IGlobalSessionRevoker,
    ) -> None:
        self._jobs = jobs
        self._env = env_store
        self._reencryptor = reencryptor
        self._sessions = sessions

    def execute(self, data: RequestSecretActionInput) -> SecretActionResult:
        kind = (data.kind or "").strip()
        if kind not in APPLYABLE_KINDS:
            raise ValidationDomainError(_("Ação de segredo desconhecida."))
        _require_confirmation(data.confirmation)
        if kind in {KIND_ROTATE_SECRET, KIND_PRUNE_SECRET, KIND_ROTATE_DATA, KIND_PRUNE_DATA, KIND_ROTATE_BACKUP}:
            if not getattr(settings, "PDL_ALLOW_RUNTIME_SECRET_ROTATION", False) and data.apply_now:
                job = self._jobs.create(
                    kind=kind, actor_id=data.actor_id, source=data.source, confirmation=data.confirmation
                )
                return SecretActionResult(
                    ok=True,
                    job_id=str(job["id"]),
                    status="pending",
                    message=_(
                        "Pedido registrado. Aplique com ./setup.sh configure-production "
                        "--apply-pending-rotations ou habilite PDL_ALLOW_RUNTIME_SECRET_ROTATION."
                    ),
                    details={"confirmation_domain": _domain_confirmation()},
                )
            if data.apply_now and not self._env.is_writable():
                raise ValidationDomainError(
                    _("O arquivo .env não está gravável neste processo. Use o configurador no host.")
                )
        job = self._jobs.create(
            kind=kind, actor_id=data.actor_id, source=data.source, confirmation=data.confirmation
        )
        if not data.apply_now:
            return SecretActionResult(
                ok=True,
                job_id=str(job["id"]),
                status="pending",
                message=_("Pedido enfileirado."),
            )
        return ApplySecretRotationJobUseCase(
            self._jobs, self._env, self._reencryptor, self._sessions
        ).execute(ApplySecretRotationJobInput(job_id=UUID(str(job["id"]))))


@dataclass(frozen=True, slots=True)
class ApplySecretRotationJobInput:
    job_id: UUID


class ApplySecretRotationJobUseCase(UseCase[ApplySecretRotationJobInput, SecretActionResult]):
    """Executa um job pendente (painel, Beat ou management command)."""

    def __init__(
        self,
        jobs: ISecretRotationJobStore,
        env_store: ISecretsEnvStore,
        reencryptor: ISealedDataReencryptor,
        sessions: IGlobalSessionRevoker,
    ) -> None:
        self._jobs = jobs
        self._env = env_store
        self._reencryptor = reencryptor
        self._sessions = sessions

    def execute(self, data: ApplySecretRotationJobInput) -> SecretActionResult:
        job = self._jobs.get(data.job_id)
        if job is None:
            raise ValidationDomainError(_("Job de rotação não encontrado."))
        if job["status"] not in {"pending", "failed"}:
            raise ValidationDomainError(_("Job já foi processado."))
        kind = job["kind"]
        try:
            details, restart = self._apply(kind)
        except Exception as exc:  # noqa: BLE001 — persiste falha auditável
            self._jobs.mark(data.job_id, status="failed", error=str(exc))
            return SecretActionResult(
                ok=False,
                job_id=str(data.job_id),
                status="failed",
                message=str(exc),
            )
        updated = self._jobs.mark(
            data.job_id,
            status="applied",
            result=details,
            restart_required=restart,
        )
        return SecretActionResult(
            ok=True,
            job_id=str(updated["id"]),
            status="applied",
            message=_("Ação aplicada."),
            restart_required=restart,
            details=details,
        )

    def _apply(self, kind: str) -> tuple[dict[str, Any], bool]:
        if kind == KIND_REVOKE_SESSIONS:
            count = self._sessions.revoke_all()
            return {"revoked": count}, False
        if kind == KIND_REENCRYPT:
            counts = self._reencryptor.reencrypt()
            return dict(counts), False
        if kind == KIND_ROTATE_SECRET:
            current = str(settings.SECRET_KEY)
            fallbacks = push_fallback(
                current,
                list(getattr(settings, "SECRET_KEY_FALLBACKS", None) or []),
                maximum=int(getattr(settings, "SECRET_KEY_FALLBACK_MAX", MAX_SECRET_FALLBACKS) or MAX_SECRET_FALLBACKS),
            )
            new_key = generate_secret_key()
            rotated_at = utc_now_iso()
            self._env.apply_secret_key_rotation(new_key=new_key, fallbacks=fallbacks, rotated_at=rotated_at)
            return {
                "fingerprint": fingerprint(new_key),
                "fallback_count": len(fallbacks),
                "rotated_at": rotated_at,
            }, True
        if kind == KIND_PRUNE_SECRET:
            removed = self._env.apply_secret_key_prune()
            return {"removed": len(removed), "fingerprints": [fingerprint(item) for item in removed]}, True
        if kind == KIND_ROTATE_DATA:
            current = str(getattr(settings, "PDL_DATA_ENCRYPTION_KEY", "") or "")
            if not current:
                raise ValidationDomainError(_("PDL_DATA_ENCRYPTION_KEY ausente."))
            fallbacks = push_fallback(
                current,
                list(getattr(settings, "PDL_DATA_ENCRYPTION_KEY_FALLBACKS", None) or []),
                maximum=MAX_DATA_FALLBACKS,
            )
            new_key = generate_fernet_key()
            rotated_at = utc_now_iso()
            self._env.apply_data_key_rotation(new_key=new_key, fallbacks=fallbacks, rotated_at=rotated_at)
            return {
                "fingerprint": fingerprint(new_key),
                "fallback_count": len(fallbacks),
                "rotated_at": rotated_at,
                "hint": "reencrypt_sealed_data",
            }, True
        if kind == KIND_PRUNE_DATA:
            removed = self._env.apply_data_key_prune()
            return {"removed": len(removed), "fingerprints": [fingerprint(item) for item in removed]}, True
        if kind == KIND_ROTATE_BACKUP:
            current = str(getattr(settings, "BACKUP_ENCRYPTION_KEY", "") or "")
            fallbacks = push_fallback(
                current,
                list(getattr(settings, "BACKUP_ENCRYPTION_KEY_FALLBACKS", None) or []),
                maximum=MAX_DATA_FALLBACKS,
            ) if current else list(getattr(settings, "BACKUP_ENCRYPTION_KEY_FALLBACKS", None) or [])
            new_key = generate_secret_key(32)
            self._env.apply_backup_key_rotation(new_key=new_key, fallbacks=fallbacks)
            return {"fingerprint": fingerprint(new_key), "fallback_count": len(fallbacks)}, False
        raise ValidationDomainError(_("Ação de segredo desconhecida."))


@dataclass(frozen=True, slots=True)
class AutoSecretMaintenanceInput:
    source: str = "beat"


class AutoSecretMaintenanceUseCase(UseCase[AutoSecretMaintenanceInput, dict[str, Any]]):
    """Prune de fallbacks expirados e pedido automático de rotação da SECRET_KEY."""

    def __init__(
        self,
        jobs: ISecretRotationJobStore,
        env_store: ISecretsEnvStore,
        reencryptor: ISealedDataReencryptor,
        sessions: IGlobalSessionRevoker,
    ) -> None:
        self._jobs = jobs
        self._request = RequestSecretActionUseCase(jobs, env_store, reencryptor, sessions)

    def execute(self, data: AutoSecretMaintenanceInput) -> dict[str, Any]:
        actions: list[str] = []
        ttl = int(getattr(settings, "SECRET_KEY_FALLBACK_TTL_DAYS", 7) or 7)
        secret_rotated = str(getattr(settings, "SECRET_KEY_ROTATED_AT", "") or "")
        secret_fallbacks = list(getattr(settings, "SECRET_KEY_FALLBACKS", None) or [])
        data_rotated = str(getattr(settings, "PDL_DATA_ENCRYPTION_ROTATED_AT", "") or "")
        data_fallbacks = list(getattr(settings, "PDL_DATA_ENCRYPTION_KEY_FALLBACKS", None) or [])
        confirmation = _domain_confirmation()

        if _stale(secret_rotated, ttl, len(secret_fallbacks)) and not self._jobs.has_pending_kind(KIND_PRUNE_SECRET):
            result = self._request.execute(
                RequestSecretActionInput(
                    kind=KIND_PRUNE_SECRET,
                    actor_id=None,
                    confirmation=confirmation,
                    source=data.source,
                    apply_now=bool(getattr(settings, "PDL_ALLOW_RUNTIME_SECRET_ROTATION", False)),
                )
            )
            actions.append(f"prune_secret:{result.status}")

        if _stale(data_rotated, ttl, len(data_fallbacks)) and not self._jobs.has_pending_kind(KIND_PRUNE_DATA):
            # Só remove fallbacks de dados se não houver nada pendente de reencrypt recente.
            result = self._request.execute(
                RequestSecretActionInput(
                    kind=KIND_PRUNE_DATA,
                    actor_id=None,
                    confirmation=confirmation,
                    source=data.source,
                    apply_now=bool(getattr(settings, "PDL_ALLOW_RUNTIME_SECRET_ROTATION", False)),
                )
            )
            actions.append(f"prune_data:{result.status}")

        auto_days = int(getattr(settings, "SECRET_KEY_AUTO_ROTATE_DAYS", 0) or 0)
        if auto_days > 0 and not self._jobs.has_pending_kind(KIND_ROTATE_SECRET):
            parsed = parse_iso(secret_rotated)
            due = parsed is None or (timezone.now() - parsed >= timedelta(days=auto_days))
            if due:
                result = self._request.execute(
                    RequestSecretActionInput(
                        kind=KIND_ROTATE_SECRET,
                        actor_id=None,
                        confirmation=confirmation,
                        source=data.source,
                        apply_now=bool(getattr(settings, "PDL_ALLOW_RUNTIME_SECRET_ROTATION", False)),
                    )
                )
                actions.append(f"rotate_secret:{result.status}")
        return {"actions": actions}
