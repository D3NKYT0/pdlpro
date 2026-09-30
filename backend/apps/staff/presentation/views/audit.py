"""View de listagem de audit logs para o painel staff."""

from __future__ import annotations

from django.utils.translation import gettext_lazy
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.staff.application.audit import ListAuditLogsUseCase
from apps.staff.domain.audit import AuditLogFilters
from apps.staff.presentation.audit_serializers import (
    AuditLogFiltersSerializer,
    AuditLogPageSerializer,
)
from common.permissions import IsStaffMember
from common.views import InjectedAPIView


@extend_schema(
    tags=["Staff - Auditoria"],
    summary=gettext_lazy("Logs de auditoria"),
    description=gettext_lazy(
        "Listagem paginada e filtrada do trail de auditoria das operações staff."
    ),
    parameters=[AuditLogFiltersSerializer],
    responses=AuditLogPageSerializer,
)
class StaffAuditLogView(InjectedAPIView):
    """Listagem paginada e filtrada do trail de auditoria staff.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated, IsStaffMember].
    """

    permission_classes = [IsAuthenticated, IsStaffMember]

    def get(self, request):
        filters_ser = AuditLogFiltersSerializer(data=request.query_params)
        filters_ser.is_valid(raise_exception=True)
        filters = AuditLogFilters(**filters_ser.validated_data)
        result = self.resolve(ListAuditLogsUseCase).execute(filters)
        serializer = AuditLogPageSerializer(result)
        response = Response(serializer.data)
        response["Cache-Control"] = "no-store"
        return response
