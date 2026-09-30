"""Portas e tipos do módulo de auditoria para consulta pelo painel staff."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime


@dataclass(frozen=True, slots=True)
class AuditLogEntry:
    """Representação de leitura de um registro de auditoria."""

    id: int
    actor_id: int | None
    actor_username: str
    action: str
    request_id: str
    ip_address: str | None
    method: str
    path: str
    status_code: int
    target_type: str
    target_id: str
    payload: dict
    created_at: datetime


@dataclass(frozen=True, slots=True)
class AuditLogFilters:
    """Filtros de pesquisa para o log de auditoria."""

    actor: str = ""
    action: str = ""
    method: str = ""
    status_min: int | None = None
    status_max: int | None = None
    date_from: datetime | None = None
    date_to: datetime | None = None
    search: str = ""
    page: int = 1
    page_size: int = 25


@dataclass(frozen=True, slots=True)
class AuditLogPage:
    """Resultado paginado de registros de auditoria."""

    count: int
    total_pages: int
    results: list[AuditLogEntry] = field(default_factory=list)


class IAuditLogReadRepository(ABC):
    """Porta de leitura do log de auditoria para consulta pelo painel staff.

    Injete esta interface nos casos de uso de listagem e registre o adaptador no provider.
    """

    @abstractmethod
    def list(self, filters: AuditLogFilters) -> AuditLogPage:
        """Retorna página de registros filtrados e ordenados por data decrescente."""

        raise NotImplementedError
