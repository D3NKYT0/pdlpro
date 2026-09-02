from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.utils.urls import replace_query_param

from apps.staff.application.financial_reports import GetFinancialReportUseCase
from apps.staff.domain.financial_reports import FinancialReportInput
from apps.staff.presentation.financial_serializers import (
    BalanceFiltersSerializer,
    BalanceReportSerializer,
    CashFlowFiltersSerializer,
    CashFlowReportSerializer,
    PaymentFiltersSerializer,
    PaymentReportSerializer,
)
from common.permissions import IsStaffMember
from common.views import InjectedAPIView


class FinancialReportView(InjectedAPIView):
    """Entrada HTTP para ``GetFinancialReportUseCase``.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated, IsStaffMember]. Resolve a aplicação no escopo da requisição antes de
    montar a resposta.
    """

    permission_classes = [IsAuthenticated, IsStaffMember]
    report = "balances"
    filters_class = BalanceFiltersSerializer

    def get(self, request):
        filters = self.filters_class(data=request.query_params)
        filters.is_valid(raise_exception=True)
        data = FinancialReportInput(report=self.report, **filters.validated_data)
        result = self.resolve(GetFinancialReportUseCase).execute(data)
        url = request.build_absolute_uri()
        response = Response({
            "count": result.count,
            "total_pages": result.total_pages,
            "next": replace_query_param(url, "page", data.page + 1) if data.page < result.total_pages else None,
            "previous": replace_query_param(url, "page", data.page - 1) if data.page > 1 else None,
            "results": result.results,
            "summary": result.summary,
        })
        response["Cache-Control"] = "no-store"
        return response


@extend_schema(tags=["Staff / Financeiro"], parameters=[BalanceFiltersSerializer], responses=BalanceReportSerializer)
class BalanceReportView(FinancialReportView):
    """Expõe o relatório de saldos usando os filtros e a paginação da base financeira.

    Usa os handlers herdados ou associados nesta classe. As opções abaixo especializam o
    comportamento da view base. Usa as permissões herdadas da base ou definidas nos padrões do
    DRF.
    """

    pass


@extend_schema(tags=["Staff / Financeiro"], parameters=[BalanceFiltersSerializer], responses=BalanceReportSerializer)
class ReconciliationReportView(FinancialReportView):
    """Especializa a consulta financeira para conciliação de saldos e movimentações.

    Usa os handlers herdados ou associados nesta classe. As opções abaixo especializam o
    comportamento da view base. Usa as permissões herdadas da base ou definidas nos padrões do
    DRF.
    """

    report = "reconciliation"


@extend_schema(tags=["Staff / Financeiro"], parameters=[CashFlowFiltersSerializer], responses=CashFlowReportSerializer)
class CashFlowReportView(FinancialReportView):
    """Especializa a consulta financeira para o relatório de fluxo de caixa.

    Usa os handlers herdados ou associados nesta classe. As opções abaixo especializam o
    comportamento da view base. Usa as permissões herdadas da base ou definidas nos padrões do
    DRF.
    """

    report = "cash-flow"
    filters_class = CashFlowFiltersSerializer


@extend_schema(tags=["Staff / Financeiro"], parameters=[PaymentFiltersSerializer], responses=PaymentReportSerializer)
class PaymentReportView(FinancialReportView):
    """Especializa a consulta financeira para o relatório de pagamentos.

    Usa os handlers herdados ou associados nesta classe. As opções abaixo especializam o
    comportamento da view base. Usa as permissões herdadas da base ou definidas nos padrões do
    DRF.
    """

    report = "payments"
    filters_class = PaymentFiltersSerializer
