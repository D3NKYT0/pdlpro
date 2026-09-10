from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID

from apps.accounts.domain.lgpd import (
    AccountDeletionResult,
    DataExportResult,
    DeleteCodeResult,
    ILgpdPrivacyService,
)
from common.architecture.base import UseCase


@dataclass(frozen=True, slots=True)
class RequestDataExportInput:
    user_id: UUID
    ip: str | None = None
    user_agent: str = ""


class RequestDataExportUseCase(UseCase[RequestDataExportInput, DataExportResult]):
    """Gera (ou reutiliza) o pacote de portabilidade LGPD e envia o link por e-mail."""

    def __init__(self, lgpd: ILgpdPrivacyService) -> None:
        self._lgpd = lgpd

    def execute(self, data: RequestDataExportInput) -> DataExportResult:
        return self._lgpd.request_export(
            data.user_id,
            ip=data.ip,
            user_agent=data.user_agent,
        )


@dataclass(frozen=True, slots=True)
class RequestAccountDeletionCodeInput:
    user_id: UUID


class RequestAccountDeletionCodeUseCase(UseCase[RequestAccountDeletionCodeInput, DeleteCodeResult]):
    """Envia OTP de confirmação para exclusão/anonimização da conta."""

    def __init__(self, lgpd: ILgpdPrivacyService) -> None:
        self._lgpd = lgpd

    def execute(self, data: RequestAccountDeletionCodeInput) -> DeleteCodeResult:
        return self._lgpd.request_delete_code(data.user_id)


@dataclass(frozen=True, slots=True)
class DeleteAccountInput:
    user_id: UUID
    code: str


class DeleteAccountUseCase(UseCase[DeleteAccountInput, AccountDeletionResult]):
    """Valida o OTP e anonimiza a conta (direito ao esquecimento)."""

    def __init__(self, lgpd: ILgpdPrivacyService) -> None:
        self._lgpd = lgpd

    def execute(self, data: DeleteAccountInput) -> AccountDeletionResult:
        return self._lgpd.delete_account(data.user_id, data.code)


@dataclass(frozen=True, slots=True)
class ResolveLgpdExportDownloadInput:
    token: str


class ResolveLgpdExportDownloadUseCase(UseCase[ResolveLgpdExportDownloadInput, Any]):
    """Resolve o token assinado do pacote LGPD para download."""

    def __init__(self, lgpd: ILgpdPrivacyService) -> None:
        self._lgpd = lgpd

    def execute(self, data: ResolveLgpdExportDownloadInput) -> Any:
        export_log = self._lgpd.resolve_export_download(data.token)
        self._lgpd.mark_export_downloaded(export_log)
        return export_log
