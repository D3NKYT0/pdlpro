from django.utils.translation import gettext_lazy
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.staff.application.notifications import (
    DeleteStaffNotificationUseCase,
    ListStaffNotificationsInput,
    ListStaffNotificationsUseCase,
    SendStaffNotificationUseCase,
)
from common.permissions import IsStaffMember
from common.views import InjectedAPIView


class StaffNotificationsView(InjectedAPIView):
    """Entrada HTTP para listar, enviar e excluir avisos da equipe."""

    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Listar avisos"),
        description=gettext_lazy("Lista avisos recentes enviados a jogadores, com filtro opcional por texto."),
    )
    def get(self, request):
        query = request.query_params.get("q") or ""
        return Response(self.resolve(ListStaffNotificationsUseCase).execute(ListStaffNotificationsInput(query=query)))

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Enviar aviso"),
        description=gettext_lazy("Envia um aviso a um usuário ativo ou a todas as contas ativas, com entrega por push."),
    )
    def post(self, request):
        return Response(self.resolve(SendStaffNotificationUseCase).execute(request.data or {}))

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Excluir aviso"),
        description=gettext_lazy("Remove o aviso persistido identificado no payload."),
    )
    def delete(self, request):
        return Response(self.resolve(DeleteStaffNotificationUseCase).execute(request.data or {}))
