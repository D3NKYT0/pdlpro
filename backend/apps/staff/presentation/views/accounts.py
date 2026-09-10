from django.utils.translation import gettext_lazy
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.server.application.account_use_cases import (
    ForceUnlinkGameAccountUseCase,
    InspectGameAccountUseCase,
)
from common.permissions import IsStaffMember
from common.views import InjectedAPIView


class StaffInspectGameAccountView(InjectedAPIView):
    """Entrada HTTP para ``InspectGameAccountUseCase``.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated, IsStaffMember]. Resolve a aplicação no escopo da requisição antes de
    montar a resposta.
    """

    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Inspecionar conta de jogo"),
        description=gettext_lazy("Consulta os dados administrativos da conta de jogo informada pelo login."),
    )
    def get(self, request):
        return Response(self.resolve(InspectGameAccountUseCase).execute(request.query_params.get("login") or ""))


class StaffUnlinkGameAccountView(InjectedAPIView):
    """Entrada HTTP para ``ForceUnlinkGameAccountUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated, IsStaffMember]. Resolve a aplicação no escopo da requisição antes de
    montar a resposta.
    """

    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Forçar desvínculo de conta"),
        description=gettext_lazy("Remove forçadamente o vínculo da conta de jogo informada pelo login."),
    )
    def post(self, request):
        return Response(self.resolve(ForceUnlinkGameAccountUseCase).execute(request.data.get("login") or ""))
