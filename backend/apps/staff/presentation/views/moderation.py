from django.utils.translation import gettext_lazy
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.server.application.moderation_use_cases import (
    ApplyModerationActionUseCase,
    GetModerationCharacterUseCase,
    ModerationActionInput,
    SearchModerationCharactersUseCase,
    SearchModerationInput,
)
from apps.server.domain.moderation import MODERATION_ACTIONS
from common.architecture.exceptions import ValidationDomainError
from common.permissions import IsStaffMember
from common.views import InjectedAPIView


class ModerationSearchQuery(serializers.Serializer):
    """Filtros da listagem de personagens para moderação."""

    q = serializers.CharField(required=False, allow_blank=True, max_length=45, default="")
    status = serializers.ChoiceField(
        required=False,
        default="all",
        choices=["all", "online", "offline", "banned", "jailed"],
    )
    page = serializers.IntegerField(required=False, default=1, min_value=1, max_value=1000000)


class ModerationActionSerializer(serializers.Serializer):
    """Valida a ação administrativa sobre um personagem."""

    action = serializers.ChoiceField(choices=list(MODERATION_ACTIONS))
    char_id = serializers.IntegerField(min_value=1)
    reason = serializers.CharField(required=False, allow_blank=True, max_length=255, default="")
    minutes = serializers.IntegerField(required=False, default=0, min_value=0, max_value=60 * 24 * 30)
    town = serializers.CharField(required=False, allow_blank=True, max_length=40, default="")


class StaffModerationCharactersView(InjectedAPIView):
    """Lista personagens do jogo para a equipe aplicar kick, prisão, banimento e teleporte."""

    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Listar personagens para moderação"),
        description=gettext_lazy(
            "Busca personagens por nick, login ou e-mail e devolve dados administrativos da conta."
        ),
    )
    def get(self, request):
        query = ModerationSearchQuery(data=request.query_params)
        query.is_valid(raise_exception=True)
        data = query.validated_data
        return Response(
            self.resolve(SearchModerationCharactersUseCase).execute(
                SearchModerationInput(
                    query=data.get("q") or "",
                    status=data.get("status") or "all",
                    page=int(data.get("page") or 1),
                )
            )
        )


class StaffModerationCharacterView(InjectedAPIView):
    """Consulta a ficha administrativa de um personagem e o histórico recente."""

    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Consultar personagem para moderação"),
        description=gettext_lazy("Devolve personagem, conta, e-mail, prisão, banimento e o histórico da equipe."),
    )
    def get(self, request, char_id: int):
        if char_id < 1:
            raise ValidationDomainError("Informe um número inteiro válido.")
        return Response(self.resolve(GetModerationCharacterUseCase).execute(char_id))


class StaffModerationActionView(InjectedAPIView):
    """Executa kick, prisão, banimento ou teleporte sobre o personagem informado."""

    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Executar ação de moderação"),
        description=gettext_lazy(
            "Aplica kick, jail, unjail, ban, unban ou teleporte. Personagem online só reflete "
            "posição e kick no próximo login; o banimento da conta impede o relogin."
        ),
    )
    def post(self, request):
        serializer = ModerationActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        return Response(
            self.resolve(ApplyModerationActionUseCase).execute(
                ModerationActionInput(
                    actor_id=request.user.id,
                    actor_username=request.user.username,
                    action=data["action"],
                    char_id=data["char_id"],
                    reason=data.get("reason") or "",
                    minutes=int(data.get("minutes") or 0),
                    town=data.get("town") or "",
                )
            )
        )
