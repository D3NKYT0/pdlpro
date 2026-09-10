from django.utils.translation import gettext_lazy
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.utils.urls import replace_query_param

from apps.staff.application.operational_reports import GetOperationalReportUseCase
from apps.staff.domain.operational_reports import OperationalReportInput
from apps.staff.presentation.operational_serializers import (
    AuctionReportFiltersSerializer,
    InventoryReportFiltersSerializer,
    MarketplaceReportFiltersSerializer,
    OperationalReportResponseSerializer,
    PurchaseReportFiltersSerializer,
)
from common.permissions import IsStaffMember
from common.views import InjectedAPIView


class OperationalReportView(InjectedAPIView):
    """Entrada HTTP para ``GetOperationalReportUseCase``."""

    permission_classes = [IsAuthenticated, IsStaffMember]
    report = "inventory"
    filters_class = InventoryReportFiltersSerializer

    def get(self, request):
        filters = self.filters_class(data=request.query_params)
        filters.is_valid(raise_exception=True)
        data = OperationalReportInput(report=self.report, **filters.validated_data)
        result = self.resolve(GetOperationalReportUseCase).execute(data)
        url = request.build_absolute_uri()
        response = Response(
            {
                "count": result.count,
                "total_pages": result.total_pages,
                "next": replace_query_param(url, "page", data.page + 1) if data.page < result.total_pages else None,
                "previous": replace_query_param(url, "page", data.page - 1) if data.page > 1 else None,
                "results": result.results,
                "summary": result.summary,
            }
        )
        response["Cache-Control"] = "no-store"
        return response


@extend_schema(
    tags=["Staff / Relatórios"],
    summary=gettext_lazy("Relatório de inventário"),
    description=gettext_lazy("Movimentações de inventário do painel com totais, tops e série diária."),
    parameters=[InventoryReportFiltersSerializer],
    responses=OperationalReportResponseSerializer,
)
class InventoryOperationalReportView(OperationalReportView):
    report = "inventory"
    filters_class = InventoryReportFiltersSerializer


@extend_schema(
    tags=["Staff / Relatórios"],
    summary=gettext_lazy("Relatório de leilões"),
    description=gettext_lazy("Leilões por status, lances e tops de atividade."),
    parameters=[AuctionReportFiltersSerializer],
    responses=OperationalReportResponseSerializer,
)
class AuctionsOperationalReportView(OperationalReportView):
    report = "auctions"
    filters_class = AuctionReportFiltersSerializer


@extend_schema(
    tags=["Staff / Relatórios"],
    summary=gettext_lazy("Relatório de compras da loja"),
    description=gettext_lazy("Compras concluídas, receita, carrinhos abandonados e tops de itens/pacotes/cupons."),
    parameters=[PurchaseReportFiltersSerializer],
    responses=OperationalReportResponseSerializer,
)
class PurchasesOperationalReportView(OperationalReportView):
    report = "purchases"
    filters_class = PurchaseReportFiltersSerializer


@extend_schema(
    tags=["Staff / Relatórios"],
    summary=gettext_lazy("Relatório de marketplace"),
    description=gettext_lazy("Anúncios de personagens por status, receita de vendas e tops de vendedores."),
    parameters=[MarketplaceReportFiltersSerializer],
    responses=OperationalReportResponseSerializer,
)
class MarketplaceOperationalReportView(OperationalReportView):
    report = "marketplace"
    filters_class = MarketplaceReportFiltersSerializer
