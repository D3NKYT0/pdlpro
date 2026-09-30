"""Portas e tipos do dashboard de métricas em tempo real para o painel staff."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime


@dataclass(frozen=True, slots=True)
class MetricSeries:
    """Par label/valor para séries simples."""

    label: str
    value: int | float


@dataclass(frozen=True, slots=True)
class RecentAuditEntry:
    """Entrada resumida do audit log para o dashboard."""

    actor_username: str
    action: str
    status_code: int
    created_at: datetime


@dataclass(frozen=True, slots=True)
class SlowEndpoint:
    """Endpoint com latência elevada registrada nos logs."""

    path: str
    method: str
    avg_ms: float
    count: int


@dataclass(frozen=True, slots=True)
class MetricsDashboard:
    """Conjunto de KPIs para o dashboard de observabilidade staff."""

    registrations_today: int = 0
    logins_today: int = 0
    revenue_today_brl: float = 0.0
    active_users_24h: int = 0
    total_users: int = 0
    total_orders: int = 0
    pending_orders: int = 0
    failed_webhooks_24h: int = 0
    audit_events_24h: int = 0
    registrations_series: list[MetricSeries] = field(default_factory=list)
    revenue_series: list[MetricSeries] = field(default_factory=list)
    recent_audit: list[RecentAuditEntry] = field(default_factory=list)
    top_actions: list[MetricSeries] = field(default_factory=list)


class IMetricsRepository(ABC):
    """Porta de agregação de métricas para o dashboard staff."""

    @abstractmethod
    def get_dashboard(self) -> MetricsDashboard:
        """Retorna snapshot dos KPIs do sistema."""

        raise NotImplementedError
