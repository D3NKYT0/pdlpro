"""Caso de uso de listagem de logs de auditoria para o painel staff."""

from __future__ import annotations

from apps.staff.domain.audit import (
    AuditLogFilters,
    AuditLogPage,
    IAuditLogReadRepository,
)
from common.architecture.base import UseCase


class ListAuditLogsUseCase(UseCase[AuditLogFilters, AuditLogPage]):
    """Consulta paginada e filtrada do trail de auditoria staff.

    Uso: resolva pelo container e chame ``execute(filters)``.
    """

    def __init__(self, repo: IAuditLogReadRepository) -> None:
        self._repo = repo

    def execute(self, data: AuditLogFilters) -> AuditLogPage:
        return self._repo.list(data)
