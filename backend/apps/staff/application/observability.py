from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta

from django.utils import timezone

from apps.staff.domain.observability import (
    IObservabilityLogRepository,
    ObservabilityPruneCounts,
)
from common.architecture.base import UseCase
from common.architecture.exceptions import ValidationDomainError


@dataclass(frozen=True, slots=True)
class PruneObservabilityLogsInput:
    """Política de retenção e modo (preview ou exclusão) para logs de observabilidade."""

    apply: bool
    audit_days: int
    webhook_days: int


@dataclass(frozen=True, slots=True)
class PruneObservabilityLogsResult:
    """Resumo da execução de retenção, em preview ou após exclusão."""

    applied: bool
    audit_days: int
    webhook_days: int
    counts: ObservabilityPruneCounts


class PruneObservabilityLogsUseCase(
    UseCase[PruneObservabilityLogsInput, PruneObservabilityLogsResult]
):
    """Aplica ou simula a política de retenção de audit e webhook logs.

    Uso: resolva pelo container (comando de management ou job) e chame ``execute(data)``.
    Sem ``apply``, apenas conta registros expirados; com ``apply``, exclui e devolve as
    quantidades removidas.
    """

    def __init__(self, logs: IObservabilityLogRepository) -> None:
        self._logs = logs

    def execute(self, data: PruneObservabilityLogsInput) -> PruneObservabilityLogsResult:
        if data.audit_days < 1 or data.webhook_days < 1:
            raise ValidationDomainError("Retention periods must be at least one day.")
        now = timezone.now()
        audit_before = now - timedelta(days=data.audit_days)
        webhook_before = now - timedelta(days=data.webhook_days)
        if data.apply:
            counts = self._logs.delete_expired(
                audit_before=audit_before, webhook_before=webhook_before
            )
        else:
            counts = self._logs.count_expired(
                audit_before=audit_before, webhook_before=webhook_before
            )
        return PruneObservabilityLogsResult(
            applied=data.apply,
            audit_days=data.audit_days,
            webhook_days=data.webhook_days,
            counts=counts,
        )
