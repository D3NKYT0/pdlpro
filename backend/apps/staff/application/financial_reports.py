from apps.staff.domain.financial_reports import (
    FinancialReportInput,
    FinancialReportResult,
    IFinancialReportRepository,
)
from common.architecture.base import UseCase


class GetFinancialReportUseCase(UseCase[FinancialReportInput, FinancialReportResult]):
    def __init__(self, reports: IFinancialReportRepository) -> None:
        self._reports = reports

    def execute(self, data: FinancialReportInput) -> FinancialReportResult:
        return self._reports.report(data)
