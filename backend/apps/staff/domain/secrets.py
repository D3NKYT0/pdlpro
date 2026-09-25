"""Portas e DTOs da rotação operacional de segredos."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any
from uuid import UUID


@dataclass(frozen=True, slots=True)
class SecretFingerprint:
    name: str
    fingerprint: str
    present: bool
    level: str = "ok"
    fallback_count: int = 0
    rotated_at: str | None = None
    stale_fallbacks: bool = False
    notes: tuple[str, ...] = ()


@dataclass(frozen=True, slots=True)
class SecretsStatus:
    runtime_rotation_enabled: bool
    restart_required: bool
    auto_rotate_days: int
    fallback_ttl_days: int
    confirmation_domain: str
    action_count: int = 0
    attention_count: int = 0
    secrets: tuple[SecretFingerprint, ...] = ()
    pending_jobs: tuple[dict[str, Any], ...] = ()
    recent_jobs: tuple[dict[str, Any], ...] = ()


@dataclass(frozen=True, slots=True)
class SecretActionResult:
    ok: bool
    job_id: str | None
    status: str
    message: str
    restart_required: bool = False
    details: dict[str, Any] = field(default_factory=dict)


class ISecretsEnvStore(ABC):
    """Persiste chaves no ``.env`` e aplica mudanças nos settings em memória."""

    @abstractmethod
    def is_writable(self) -> bool:
        raise NotImplementedError

    @abstractmethod
    def apply_secret_key_rotation(self, *, new_key: str, fallbacks: list[str], rotated_at: str) -> None:
        raise NotImplementedError

    @abstractmethod
    def apply_secret_key_prune(self) -> list[str]:
        """Remove fallbacks da SECRET_KEY; devolve os removidos (só fingerprints depois)."""

        raise NotImplementedError

    @abstractmethod
    def apply_data_key_rotation(
        self, *, new_key: str, fallbacks: list[str], rotated_at: str
    ) -> None:
        raise NotImplementedError

    @abstractmethod
    def apply_data_key_prune(self) -> list[str]:
        raise NotImplementedError

    @abstractmethod
    def apply_backup_key_rotation(self, *, new_key: str, fallbacks: list[str]) -> None:
        raise NotImplementedError


class ISealedDataReencryptor(ABC):
    """Regrava TOTP, códigos de recuperação e pacotes LGPD com a chave primaria."""

    @abstractmethod
    def reencrypt(self) -> dict[str, int]:
        raise NotImplementedError


class IGlobalSessionRevoker(ABC):
    """Invalida todos os refresh tokens outstanding."""

    @abstractmethod
    def revoke_all(self) -> int:
        raise NotImplementedError


class ISecretRotationJobStore(ABC):
    """Persistência dos jobs de rotação solicitados pelo painel ou pelo Beat."""

    @abstractmethod
    def create(
        self,
        *,
        kind: str,
        actor_id: UUID | None,
        source: str,
        confirmation: str = "",
    ) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def mark(
        self,
        job_id: UUID,
        *,
        status: str,
        result: dict[str, Any] | None = None,
        error: str = "",
        restart_required: bool = False,
    ) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def get(self, job_id: UUID) -> dict[str, Any] | None:
        raise NotImplementedError

    @abstractmethod
    def list_pending(self) -> list[dict[str, Any]]:
        raise NotImplementedError

    @abstractmethod
    def list_recent(self, *, limit: int = 20) -> list[dict[str, Any]]:
        raise NotImplementedError

    @abstractmethod
    def has_pending_kind(self, kind: str) -> bool:
        raise NotImplementedError
