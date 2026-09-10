from django.utils.translation import gettext_lazy
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.programs.application.use_cases import (
    CreateRoadmapEntryUseCase,
    CreateRoadmapInput,
    DeleteRoadmapEntryUseCase,
    DeleteRoadmapInput,
    GetRoadmapInput,
    GetSupporterDashboardUseCase,
    ListPublishedRoadmapUseCase,
    ListResourcesUseCase,
    ListStaffRoadmapUseCase,
    ListStaffSupportersUseCase,
    RequestCommissionPayoutUseCase,
    ReviewPayoutInput,
    ReviewPayoutUseCase,
    ReviewSupporterInput,
    ReviewSupporterUseCase,
    UpdateResourceInput,
    UpdateResourceUseCase,
    UpdateRoadmapEntryUseCase,
    UpdateRoadmapInput,
    UpsertSupporterInput,
    UpsertSupporterUseCase,
    UserScopedInput,
)
from apps.programs.domain.repositories import ISupporterRepository
from apps.programs.serializers import (
    PayoutReviewSerializer,
    PayoutSerializer,
    ResourceSerializer,
    RoadmapSerializer,
    SupporterReviewSerializer,
    SupporterSerializer,
)
from common.permissions import IsStaffMember
from common.views import InjectedAPIView


class SupporterView(InjectedAPIView):
    """Consulta o cadastro de apoiador e recebe sua inscrição via casos de uso.

    Implementa GET, POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated].
    """

    permission_classes = [IsAuthenticated]

    def _serialize_dashboard(self, request, payload: dict) -> dict:
        profile = payload["profile"]
        return {
            "profile": (
                SupporterSerializer(profile, context={"request": request}).data
                if profile is not None
                else None
            ),
            "available": payload["available"],
            "coupons": payload["coupons"],
            "commissions": payload["commissions"],
            "payouts": PayoutSerializer(payload["payouts"], many=True).data,
        }

    @extend_schema(
        tags=["Apoiadores"],
        summary=gettext_lazy("Consultar painel do apoiador"),
        description=(
            "Retorna o perfil de apoiador do usuário autenticado, saldo disponível, "
            "cupons vinculados, comissões e histórico de repasses. Se ainda não houver "
            "cadastro, devolve perfil nulo e listas vazias."
        ),
        responses=SupporterSerializer,
    )
    def get(self, request):
        payload = self.resolve(GetSupporterDashboardUseCase).execute(
            UserScopedInput(user_id=request.user.id)
        )
        return Response(self._serialize_dashboard(request, payload))

    @extend_schema(
        tags=["Apoiadores"],
        summary=gettext_lazy("Inscrever ou atualizar apoiador"),
        description=(
            "Cria ou atualiza a inscrição de apoiador do usuário autenticado. "
            "Novas inscrições e reenvios após rejeição ficam com status pendente."
        ),
        request=SupporterSerializer,
        responses=SupporterSerializer,
    )
    def post(self, request):
        row = self.resolve(ISupporterRepository).find_by_user_id(request.user.id)
        serializer = SupporterSerializer(
            row, data=request.data, partial=bool(row), context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        payload = self.resolve(UpsertSupporterUseCase).execute(
            UpsertSupporterInput(
                user_id=request.user.id,
                validated_data=dict(serializer.validated_data),
            )
        )
        return Response(self._serialize_dashboard(request, payload))


class RequestPayoutView(InjectedAPIView):
    """Recebe a solicitação de repasse de comissões do apoiador autenticado.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated].
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Apoiadores"],
        summary=gettext_lazy("Solicitar repasse de comissões"),
        description=(
            "Solicita o repasse das comissões disponíveis do apoiador autenticado. "
            "Retorna o pedido de payout criado."
        ),
        responses=PayoutSerializer,
    )
    def post(self, request):
        payout = self.resolve(RequestCommissionPayoutUseCase).execute(
            UserScopedInput(user_id=request.user.id)
        )
        return Response(PayoutSerializer(payout).data, status=201)


class StaffSupporterView(InjectedAPIView):
    """Permite à equipe consultar e revisar cadastros de apoiadores.

    Implementa GET, PATCH; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated, IsStaffMember].
    """

    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(
        tags=["Apoiadores"],
        summary=gettext_lazy("Listar apoiadores e repasses (staff)"),
        description=(
            "Lista todos os cadastros de apoiadores e os pedidos de repasse recentes "
            "para revisão pela equipe."
        ),
        responses=SupporterSerializer(many=True),
    )
    def get(self, request):
        payload = self.resolve(ListStaffSupportersUseCase).execute(None)
        return Response(
            {
                "supporters": SupporterSerializer(payload["supporters"], many=True).data,
                "payouts": PayoutSerializer(payload["payouts"], many=True).data,
            }
        )

    @extend_schema(
        tags=["Apoiadores"],
        summary=gettext_lazy("Revisar cadastro de apoiador"),
        description=(
            "Atualiza status e condições de um cadastro de apoiador. Aprovação pode "
            "elevar o papel do usuário para supporter; rejeição pode rebaixá-lo a player."
        ),
        request=SupporterReviewSerializer,
        responses=SupporterSerializer,
    )
    def patch(self, request, entry_id):
        serializer = SupporterReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        row = self.resolve(ReviewSupporterUseCase).execute(
            ReviewSupporterInput(
                entry_id=entry_id,
                status=serializer.validated_data["status"],
                review_note=serializer.validated_data["review_note"],
                commission_percent=serializer.validated_data["commission_percent"],
            )
        )
        return Response(SupporterSerializer(row).data)


class StaffPayoutView(InjectedAPIView):
    """Permite à equipe revisar pedidos de repasse de comissões.

    Implementa PATCH; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated, IsStaffMember].
    """

    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(
        tags=["Apoiadores"],
        summary=gettext_lazy("Revisar pedido de repasse"),
        description=(
            "Atualiza o status e a nota de um pedido de repasse de comissões "
            "identificado por entry_id."
        ),
        request=PayoutReviewSerializer,
        responses=PayoutSerializer,
    )
    def patch(self, request, entry_id):
        serializer = PayoutReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payout = self.resolve(ReviewPayoutUseCase).execute(
            ReviewPayoutInput(
                payout_id=entry_id,
                status=serializer.validated_data["status"],
                note=serializer.validated_data["note"],
            )
        )
        return Response(PayoutSerializer(payout).data)


class RoadmapView(InjectedAPIView):
    """Expõe as entradas publicadas do roadmap.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny].
    """

    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Roadmap"],
        summary=gettext_lazy("Listar roadmap publicado"),
        description=(
            "Retorna as entradas publicadas do roadmap. Com entry_id, devolve apenas "
            "aquela entrada; sem ele, lista todas as publicadas."
        ),
        responses=RoadmapSerializer(many=True),
    )
    def get(self, request, entry_id=None):
        from common.i18n import resolve_language

        language = resolve_language(request.query_params.get("lang"))
        result = self.resolve(ListPublishedRoadmapUseCase).execute(
            GetRoadmapInput(entry_id=entry_id, language=language)
        )
        return Response(result)


class StaffRoadmapView(InjectedAPIView):
    """Permite à equipe criar, atualizar e excluir entradas do roadmap.

    Implementa GET, POST, PATCH, DELETE; registre ``as_view()`` nas URLs do módulo. Controle de
    acesso declarado: [IsAuthenticated, IsStaffMember].
    """

    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(
        tags=["Roadmap"],
        summary=gettext_lazy("Listar roadmap (staff)"),
        description=gettext_lazy("Lista todas as entradas do roadmap, inclusive as não publicadas."),
        responses=RoadmapSerializer(many=True),
    )
    def get(self, request):
        return Response(
            RoadmapSerializer(
                self.resolve(ListStaffRoadmapUseCase).execute(None), many=True
            ).data
        )

    @extend_schema(
        tags=["Roadmap"],
        summary=gettext_lazy("Criar entrada do roadmap"),
        description=gettext_lazy("Cria uma nova entrada no roadmap com os dados enviados."),
        request=RoadmapSerializer,
        responses=RoadmapSerializer,
    )
    def post(self, request):
        serializer = RoadmapSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        row = self.resolve(CreateRoadmapEntryUseCase).execute(
            CreateRoadmapInput(fields=dict(serializer.validated_data))
        )
        return Response(RoadmapSerializer(row).data, status=201)

    @extend_schema(
        tags=["Roadmap"],
        summary=gettext_lazy("Atualizar entrada do roadmap"),
        description=gettext_lazy("Atualiza parcialmente a entrada do roadmap identificada por entry_id."),
        request=RoadmapSerializer,
        responses=RoadmapSerializer,
    )
    def patch(self, request, entry_id):
        serializer = RoadmapSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = self.resolve(UpdateRoadmapEntryUseCase).execute(
            UpdateRoadmapInput(entry_id=entry_id, fields=dict(serializer.validated_data))
        )
        return Response(RoadmapSerializer(updated).data)

    @extend_schema(
        tags=["Roadmap"],
        summary=gettext_lazy("Excluir entrada do roadmap"),
        description=gettext_lazy("Remove a entrada do roadmap identificada por entry_id."),
    )
    def delete(self, request, entry_id):
        self.resolve(DeleteRoadmapEntryUseCase).execute(DeleteRoadmapInput(entry_id=entry_id))
        return Response(status=204)


class ResourceView(InjectedAPIView):
    """Lista os recursos do sistema e seu estado de ativação.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny].
    """

    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Recursos"],
        summary=gettext_lazy("Listar recursos do sistema"),
        description=gettext_lazy("Retorna todos os recursos do sistema e o respectivo estado de ativação."),
        responses=ResourceSerializer(many=True),
    )
    def get(self, request):
        return Response(
            ResourceSerializer(
                self.resolve(ListResourcesUseCase).execute(None), many=True
            ).data
        )


class StaffResourceView(ResourceView):
    """Atualiza a configuração dos recursos do sistema pela interface administrativa.

    Implementa PATCH; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated, IsStaffMember].
    """

    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(
        tags=["Recursos"],
        summary=gettext_lazy("Listar recursos (staff)"),
        description=gettext_lazy("Lista os recursos do sistema para administração pela equipe."),
        responses=ResourceSerializer(many=True),
    )
    def get(self, request):
        return super().get(request)

    @extend_schema(
        tags=["Recursos"],
        summary=gettext_lazy("Atualizar recurso do sistema"),
        description=gettext_lazy("Atualiza parcialmente o recurso do sistema identificado por entry_id."),
        request=ResourceSerializer,
        responses=ResourceSerializer,
    )
    def patch(self, request, entry_id):
        serializer = ResourceSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = self.resolve(UpdateResourceUseCase).execute(
            UpdateResourceInput(entry_id=entry_id, fields=dict(serializer.validated_data))
        )
        return Response(ResourceSerializer(updated).data)
