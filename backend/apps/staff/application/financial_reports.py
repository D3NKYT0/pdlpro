from apps.staff.domain.financial_reports import (
    FinancialReportInput,
    FinancialReportResult,
    IFinancialReportRepository,
)
from common.architecture.base import UseCase


class GetFinancialReportUseCase(UseCase[FinancialReportInput, FinancialReportResult]):
    """Delega a geração de um relatório financeiro com filtros tipados à porta de relatórios.

    Uso: resolva pelo container e chame ``execute(data)`` com ``FinancialReportInput``. O
    retorno é ``FinancialReportResult``.
    """

    def __init__(self, reports: IFinancialReportRepository) -> None:
        self._reports = reports

    def execute(self, data: FinancialReportInput) -> FinancialReportResult:
        return self._reports.report(data)
