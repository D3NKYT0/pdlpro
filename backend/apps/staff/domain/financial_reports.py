from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date
from decimal import Decimal


@dataclass(frozen=True, slots=True)
class FinancialReportInput:
    report: str
    username: str = ""
    status: str = ""
    method: str = ""
    currency: str = ""
    date_from: date | None = None
    date_to: date | None = None
    minimum: Decimal | None = None
    maximum: Decimal | None = None
    page: int = 1
    page_size: int = 20


@dataclass(frozen=True, slots=True)
class FinancialReportResult:
    count: int
    total_pages: int
    results: list[dict]
    summary: dict


class IFinancialReportRepository(ABC):
    @abstractmethod
    def report(self, data: FinancialReportInput) -> FinancialReportResult:
        raise NotImplementedError
