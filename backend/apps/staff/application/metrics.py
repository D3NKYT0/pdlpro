"""Caso de uso do dashboard de métricas em tempo real."""

from __future__ import annotations

from apps.staff.domain.metrics import IMetricsRepository, MetricsDashboard
from common.architecture.base import UseCase


class GetMetricsDashboardUseCase(UseCase[None, MetricsDashboard]):
    """Retorna o snapshot de KPIs do sistema para o dashboard staff.

    Uso: resolva pelo container e chame ``execute(None)``.
    """

    def __init__(self, repo: IMetricsRepository) -> None:
        self._repo = repo

    def execute(self, data: None = None) -> MetricsDashboard:
        return self._repo.get_dashboard()
