from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True, slots=True)
class ObservabilityPruneCounts:
    """Quantidades de registros de auditoria e webhook elegíveis à retenção."""

    audit: int
    webhook: int


class IObservabilityLogRepository(ABC):
    """Porta de contagem e exclusão de logs de observabilidade fora da janela de retenção.

    Injete esta interface nos casos de uso de retenção e registre o adaptador no provider.
    """

    @abstractmethod
    def count_expired(
        self, *, audit_before: datetime, webhook_before: datetime
    ) -> ObservabilityPruneCounts:
        """Conta registros com ``created_at`` estritamente anterior aos cortes informados."""

        raise NotImplementedError

    @abstractmethod
    def delete_expired(
        self, *, audit_before: datetime, webhook_before: datetime
    ) -> ObservabilityPruneCounts:
        """Remove registros expirados e devolve quantos foram excluídos por tipo."""

        raise NotImplementedError
