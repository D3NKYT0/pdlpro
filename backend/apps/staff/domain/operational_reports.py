from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True, slots=True)
class OperationalReportInput:
    """Filtros e paginação das consultas operacionais de inventário, leilão, loja e marketplace.

    Construa após validar a requisição. A dataclass transporta os campos; não valida permissões.
    """

    report: str
    username: str = ""
    status: str = ""
    action: str = ""
    date_from: date | None = None
    date_to: date | None = None
    page: int = 1
    page_size: int = 20


@dataclass(frozen=True, slots=True)
class OperationalReportResult:
    """Linhas, totais e metadados devolvidos pela consulta operacional."""

    count: int
    total_pages: int
    results: list[dict]
    summary: dict


class IOperationalReportRepository(ABC):
    """Porta de agregações operacionais (inventário, leilões, compras, marketplace)."""

    @abstractmethod
    def report(self, data: OperationalReportInput) -> OperationalReportResult:
        raise NotImplementedError
