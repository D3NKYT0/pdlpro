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
    pass


@extend_schema(tags=["Staff / Financeiro"], parameters=[BalanceFiltersSerializer], responses=BalanceReportSerializer)
class ReconciliationReportView(FinancialReportView):
    report = "reconciliation"


@extend_schema(tags=["Staff / Financeiro"], parameters=[CashFlowFiltersSerializer], responses=CashFlowReportSerializer)
class CashFlowReportView(FinancialReportView):
    report = "cash-flow"
    filters_class = CashFlowFiltersSerializer


@extend_schema(tags=["Staff / Financeiro"], parameters=[PaymentFiltersSerializer], responses=PaymentReportSerializer)
class PaymentReportView(FinancialReportView):
    report = "payments"
    filters_class = PaymentFiltersSerializer
