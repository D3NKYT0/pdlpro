"""View do dashboard de métricas em tempo real para o painel staff."""

from __future__ import annotations

from dataclasses import asdict

from django.utils.translation import gettext_lazy
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.staff.application.metrics import GetMetricsDashboardUseCase
from common.permissions import HasCapability
from common.views import InjectedAPIView


@extend_schema(
    tags=["Staff - Métricas"],
    summary=gettext_lazy("Dashboard de métricas"),
    description=gettext_lazy(
        "Retorna KPIs agregados do sistema: registros, logins, receita, "
        "audit recente, webhooks falhos e séries diárias."
    ),
)
class StaffMetricsDashboardView(InjectedAPIView):
    """Dashboard de métricas em tempo real para o painel staff.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated, HasCapability].
    """

    permission_classes = [IsAuthenticated, HasCapability]
    required_capabilities = {'GET': 'metrics.view'}

    def get(self, request):
        dashboard = self.resolve(GetMetricsDashboardUseCase).execute()
        response = Response(asdict(dashboard))
        response["Cache-Control"] = "no-store"
        return response
