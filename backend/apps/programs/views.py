from django.db import transaction
from django.db.models import Sum
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.programs.models import (
    Commission,
    CommissionPayout,
    RoadmapEntry,
    Supporter,
    SystemResource,
)
from apps.programs.serializers import (
    PayoutReviewSerializer,
    PayoutSerializer,
    ResourceSerializer,
    RoadmapSerializer,
    SupporterReviewSerializer,
    SupporterSerializer,
)
from apps.programs.services import request_commission, review_payout
from apps.shop.infrastructure.models import PromotionCode
from common.permissions import IsStaffMember


class SupporterView(APIView):
    """Consulta o cadastro de apoiador, comissões e repasses do usuário e recebe sua inscrição.

    Implementa GET, POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated].
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Apoiadores"],
        summary="Consultar painel do apoiador",
        description=(
            "Retorna o perfil de apoiador do usuário autenticado, saldo disponível, "
            "cupons vinculados, comissões e histórico de repasses. Se ainda não houver "
            "cadastro, devolve perfil nulo e listas vazias."
        ),
        responses=SupporterSerializer,
    )
    def get(self, request):
        row = Supporter.objects.filter(user=request.user).first()
        if not row:
            return Response(
                {
                    "profile": None,
                    "available": "0.00",
                    "coupons": [],
                    "payouts": [],
                    "commissions": [],
                }
            )
        commissions = Commission.objects.filter(supporter=row)
        return Response(
            {
                "profile": SupporterSerializer(row, context={"request": request}).data,
                "available": str(
                    commissions.filter(payout__isnull=True).aggregate(
                        total=Sum("amount")
                    )["total"]
                    or 0
                ),
                "coupons": list(
                    PromotionCode.objects.filter(supporter=row).values(
                        "code", "percent", "active", "uses"
                    )
                ),
                "commissions": [
                    {
                        "id": str(c.id),
                        "amount": str(c.amount),
                        "created_at": c.created_at,
                        "status": c.payout.status if c.payout else "available",
                    }
                    for c in commissions.select_related("payout")[:100]
                ],
                "payouts": PayoutSerializer(row.payouts.all()[:100], many=True).data,
            }
        )

    @extend_schema(
        tags=["Apoiadores"],
        summary="Inscrever ou atualizar apoiador",
        description=(
            "Cria ou atualiza a inscrição de apoiador do usuário autenticado. "
            "Novas inscrições e reenvios após rejeição ficam com status pendente."
        ),
        request=SupporterSerializer,
        responses=SupporterSerializer,
    )
    def post(self, request):
        with transaction.atomic():
            # Serialize first-time applications on the user row, too.
            type(request.user).objects.select_for_update().get(pk=request.user.pk)
            row = Supporter.objects.filter(user=request.user).first()
            serializer = SupporterSerializer(
                row, data=request.data, partial=bool(row), context={"request": request}
            )
            serializer.is_valid(raise_exception=True)
            serializer.save(
                user=request.user,
                status="pending" if not row or row.status == "rejected" else row.status,
            )
        return self.get(request)


class RequestPayoutView(APIView):
    """Recebe a solicitação de repasse de comissões do apoiador autenticado.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated].
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Apoiadores"],
        summary="Solicitar repasse de comissões",
        description=(
            "Solicita o repasse das comissões disponíveis do apoiador autenticado. "
            "Retorna o pedido de payout criado."
        ),
        responses=PayoutSerializer,
    )
    def post(self, request):
        return Response(
            PayoutSerializer(request_commission(request.user)).data, status=201
        )


class StaffSupporterView(APIView):
    """Permite à equipe consultar e revisar cadastros de apoiadores e suas condições.

    Implementa GET, PATCH; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated, IsStaffMember].
    """

    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(
        tags=["Apoiadores"],
        summary="Listar apoiadores e repasses (staff)",
        description=(
            "Lista todos os cadastros de apoiadores e os pedidos de repasse recentes "
            "para revisão pela equipe."
        ),
        responses=SupporterSerializer(many=True),
    )
    def get(self, request):
        return Response(
            {
                "supporters": SupporterSerializer(
                    Supporter.objects.select_related("user").all(), many=True
                ).data,
                "payouts": PayoutSerializer(
                    CommissionPayout.objects.select_related("supporter").all()[:200],
                    many=True,
                ).data,
            }
        )

    @extend_schema(
        tags=["Apoiadores"],
        summary="Revisar cadastro de apoiador",
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
        with transaction.atomic():
            row = get_object_or_404(Supporter.objects.select_for_update(), id=entry_id)
            for key, value in serializer.validated_data.items():
                setattr(row, key, value)
            row.save()
            # Do not replace staff/moderator/admin privileges with a supporter role.
            user = row.user
            if row.status == "approved" and user.role == "player":
                type(user).objects.filter(pk=user.pk, role="player").update(
                    role="supporter"
                )
            elif row.status == "rejected" and user.role == "supporter":
                type(user).objects.filter(pk=user.pk, role="supporter").update(
                    role="player"
                )
        return Response(SupporterSerializer(row).data)


class StaffPayoutView(APIView):
    """Permite à equipe consultar e revisar pedidos de repasse de comissões.

    Implementa PATCH; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated, IsStaffMember].
    """

    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(
        tags=["Apoiadores"],
        summary="Revisar pedido de repasse",
        description=(
            "Atualiza o status e a nota de um pedido de repasse de comissões "
            "identificado por entry_id."
        ),
        request=PayoutReviewSerializer,
        responses=PayoutSerializer,
    )
    def patch(self, request, entry_id):
        get_object_or_404(CommissionPayout, id=entry_id)
        serializer = PayoutReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(
            PayoutSerializer(
                review_payout(
                    entry_id,
                    serializer.validated_data["status"],
                    serializer.validated_data["note"],
                )
            ).data
        )


class RoadmapView(APIView):
    """Expõe as entradas publicadas do roadmap.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny].
    """

    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Roadmap"],
        summary="Listar roadmap publicado",
        description=(
            "Retorna as entradas publicadas do roadmap. Com entry_id, devolve apenas "
            "aquela entrada; sem ele, lista todas as publicadas."
        ),
        responses=RoadmapSerializer(many=True),
    )
    def get(self, request, entry_id=None):
        rows = RoadmapEntry.objects.filter(published=True)
        if entry_id:
            return Response(
                RoadmapSerializer(get_object_or_404(rows, id=entry_id)).data
            )
        return Response(RoadmapSerializer(rows, many=True).data)


class StaffRoadmapView(APIView):
    """Permite à equipe criar, atualizar e excluir entradas do roadmap.

    Implementa GET, POST, PATCH, DELETE; registre ``as_view()`` nas URLs do módulo. Controle de
    acesso declarado: [IsAuthenticated, IsStaffMember].
    """

    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(
        tags=["Roadmap"],
        summary="Listar roadmap (staff)",
        description="Lista todas as entradas do roadmap, inclusive as não publicadas.",
        responses=RoadmapSerializer(many=True),
    )
    def get(self, request):
        return Response(RoadmapSerializer(RoadmapEntry.objects.all(), many=True).data)

    @extend_schema(
        tags=["Roadmap"],
        summary="Criar entrada do roadmap",
        description="Cria uma nova entrada no roadmap com os dados enviados.",
        request=RoadmapSerializer,
        responses=RoadmapSerializer,
    )
    def post(self, request):
        serializer = RoadmapSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=201)

    @extend_schema(
        tags=["Roadmap"],
        summary="Atualizar entrada do roadmap",
        description="Atualiza parcialmente a entrada do roadmap identificada por entry_id.",
        request=RoadmapSerializer,
        responses=RoadmapSerializer,
    )
    def patch(self, request, entry_id):
        serializer = RoadmapSerializer(
            get_object_or_404(RoadmapEntry, id=entry_id),
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @extend_schema(
        tags=["Roadmap"],
        summary="Excluir entrada do roadmap",
        description="Remove a entrada do roadmap identificada por entry_id.",
    )
    def delete(self, request, entry_id):
        get_object_or_404(RoadmapEntry, id=entry_id).delete()
        return Response(status=204)


class ResourceView(APIView):
    """Lista os recursos do sistema e seu estado de ativação.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny].
    """

    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Recursos"],
        summary="Listar recursos do sistema",
        description="Retorna todos os recursos do sistema e o respectivo estado de ativação.",
        responses=ResourceSerializer(many=True),
    )
    def get(self, request):
        return Response(
            ResourceSerializer(SystemResource.objects.all(), many=True).data
        )


class StaffResourceView(ResourceView):
    """Atualiza a configuração dos recursos do sistema pela interface administrativa.

    Implementa PATCH; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated, IsStaffMember].
    """

    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(
        tags=["Recursos"],
        summary="Listar recursos (staff)",
        description="Lista os recursos do sistema para administração pela equipe.",
        responses=ResourceSerializer(many=True),
    )
    def get(self, request):
        return super().get(request)

    @extend_schema(
        tags=["Recursos"],
        summary="Atualizar recurso do sistema",
        description="Atualiza parcialmente o recurso do sistema identificado por entry_id.",
        request=ResourceSerializer,
        responses=ResourceSerializer,
    )
    def patch(self, request, entry_id):
        serializer = ResourceSerializer(
            get_object_or_404(SystemResource, id=entry_id),
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
