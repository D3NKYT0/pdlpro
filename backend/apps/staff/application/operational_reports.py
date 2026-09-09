from apps.staff.domain.operational_reports import (
    IOperationalReportRepository,
    OperationalReportInput,
    OperationalReportResult,
)
from common.architecture.base import UseCase


class GetOperationalReportUseCase(UseCase[OperationalReportInput, OperationalReportResult]):
    """Delega a geração de um relatório operacional com filtros tipados à porta correspondente."""

    def __init__(self, reports: IOperationalReportRepository) -> None:
        self._reports = reports

    def execute(self, data: OperationalReportInput) -> OperationalReportResult:
        return self._reports.report(data)
