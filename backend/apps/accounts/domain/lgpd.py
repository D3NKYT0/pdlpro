from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Any
from uuid import UUID


@dataclass(frozen=True, slots=True)
class DataExportResult:
    """Resultado de uma solicitação de portabilidade."""

    detail: str
    download_url: str | None = None
    expires_at: datetime | None = None
    reused: bool = False


@dataclass(frozen=True, slots=True)
class DeleteCodeResult:
    """Confirmação de envio do OTP de exclusão."""

    detail: str


@dataclass(frozen=True, slots=True)
class AccountDeletionResult:
    """Confirmação de anonimização da conta."""

    detail: str


class ILgpdPrivacyService(ABC):
    """Porta de portabilidade e exclusão (LGPD) sem acoplar a ORM na aplicação."""

    @abstractmethod
    def request_export(
        self,
        user_id: UUID,
        *,
        ip: str | None,
        user_agent: str,
    ) -> DataExportResult:
        raise NotImplementedError

    @abstractmethod
    def request_delete_code(self, user_id: UUID) -> DeleteCodeResult:
        raise NotImplementedError

    @abstractmethod
    def delete_account(self, user_id: UUID, code: str) -> AccountDeletionResult:
        raise NotImplementedError

    @abstractmethod
    def resolve_export_download(self, token: str) -> Any:
        """Devolve o registro de exportação válido para o token assinado."""
        raise NotImplementedError

    @abstractmethod
    def mark_export_downloaded(self, export_log: Any) -> None:
        raise NotImplementedError
