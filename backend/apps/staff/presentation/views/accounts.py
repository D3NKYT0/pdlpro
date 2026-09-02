from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.server.application.account_use_cases import ForceUnlinkGameAccountUseCase, InspectGameAccountUseCase
from common.permissions import IsStaffMember
from common.views import InjectedAPIView


class StaffInspectGameAccountView(InjectedAPIView):
    """Entrada HTTP para ``InspectGameAccountUseCase``.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated, IsStaffMember]. Resolve a aplicação no escopo da requisição antes de
    montar a resposta.
    """

    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(tags=["Staff"])
    def get(self, request):
        return Response(self.resolve(InspectGameAccountUseCase).execute(request.query_params.get("login") or ""))


class StaffUnlinkGameAccountView(InjectedAPIView):
    """Entrada HTTP para ``ForceUnlinkGameAccountUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated, IsStaffMember]. Resolve a aplicação no escopo da requisição antes de
    montar a resposta.
    """

    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(tags=["Staff"])
    def post(self, request):
        return Response(self.resolve(ForceUnlinkGameAccountUseCase).execute(request.data.get("login") or ""))
