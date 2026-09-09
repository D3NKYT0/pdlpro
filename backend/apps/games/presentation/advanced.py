from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.games.application.advanced_use_cases import (
    BattlePassActionInput,
    BattlePassActionUseCase,
    BattlePassDetailsInput,
    BuyBaitInput,
    BuyBaitUseCase,
    DailyBonusDetailsInput,
    FishingDetailsInput,
    GameStatisticsInput,
    GetBattlePassDetailsUseCase,
    GetDailyBonusDetailsUseCase,
    GetFishingDetailsUseCase,
    GetGameStatisticsUseCase,
)
from apps.games.application.staff_content_schema import (
    CONFIG_FIELDS,
    RELATED_FIELDS,
    known_content_kind,
)
from apps.games.application.staff_content_use_cases import (
    GetGameContentInput,
    GetGameContentUseCase,
    ListGameContentInput,
    ListGameContentUseCase,
    UpsertGameContentInput,
    UpsertGameContentUseCase,
)
from common.permissions import IsStaffMember
from common.views import InjectedAPIView


class BattleActionSerializer(serializers.Serializer):
    """Valida a ação e os identificadores do conteúdo adicional do passe de batalha."""

    action = serializers.ChoiceField(
        choices=["quest", "exchange", "milestone", "auto-claim"]
    )
    entry_id = serializers.UUIDField(required=False, allow_null=True)
    enabled = serializers.BooleanField(default=False)

    def validate(self, data):
        if data["action"] != "auto-claim" and not data.get("entry_id"):
            raise serializers.ValidationError("Selecione uma recompensa.")
        return data


class BattleDetailsView(InjectedAPIView):
    """Consulta o conteúdo adicional do passe e encaminha ações validadas ao serviço de batalha."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Jogos"],
        summary="Detalhes do passe de batalha",
        description="Retorna o conteúdo adicional do passe de batalha disponível para o jogador autenticado.",
    )
    def get(self, request):
        return Response(
            self.resolve(GetBattlePassDetailsUseCase).execute(
                BattlePassDetailsInput(user_id=request.user.id)
            )
        )

    @extend_schema(
        tags=["Jogos"],
        summary="Ação do passe de batalha",
        description="Executa uma ação validada no conteúdo adicional do passe (missão, troca, marco ou resgate automático).",
        request=BattleActionSerializer,
    )
    def post(self, request):
        serializer = BattleActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        return Response(
            self.resolve(BattlePassActionUseCase).execute(
                BattlePassActionInput(
                    user_id=request.user.id,
                    action=data["action"],
                    entry_id=str(data["entry_id"]) if data.get("entry_id") else None,
                    enabled=data.get("enabled", False),
                )
            )
        )


class DailyDetailsView(InjectedAPIView):
    """Consulta o calendário e os detalhes do bônus diário para o jogador."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Jogos"],
        summary="Detalhes do bônus diário",
        description="Retorna o calendário e os detalhes do bônus diário do jogador autenticado.",
    )
    def get(self, request):
        return Response(
            self.resolve(GetDailyBonusDetailsUseCase).execute(
                DailyBonusDetailsInput(user_id=request.user.id)
            )
        )


class BaitPurchaseSerializer(serializers.Serializer):
    """Valida a seleção e a quantidade de iscas para compra."""

    bait_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1, max_value=999, default=1)


class FishingDetailsView(InjectedAPIView):
    """Lista iscas, estoque e capturas do usuário e permite comprar iscas."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Jogos"],
        summary="Detalhes da pesca",
        description="Lista iscas ativas, estoque do jogador e coleção de peixes capturados.",
    )
    def get(self, request):
        return Response(
            self.resolve(GetFishingDetailsUseCase).execute(
                FishingDetailsInput(user_id=request.user.id)
            )
        )

    @extend_schema(
        tags=["Jogos"],
        summary="Comprar iscas",
        description="Compra iscas de pesca para o jogador autenticado com a quantidade informada.",
        request=BaitPurchaseSerializer,
    )
    def post(self, request):
        serializer = BaitPurchaseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(
            self.resolve(BuyBaitUseCase).execute(
                BuyBaitInput(
                    user_id=request.user.id,
                    bait_id=str(serializer.validated_data["bait_id"]),
                    quantity=serializer.validated_data["quantity"],
                )
            )
        )


class GameStatisticsView(InjectedAPIView):
    """Expõe as estatísticas produzidas pelo serviço de jogos."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Jogos"],
        summary="Estatísticas de jogos",
        description="Retorna as estatísticas do tipo solicitado para o jogador autenticado.",
    )
    def get(self, request, kind):
        return Response(
            self.resolve(GetGameStatisticsUseCase).execute(
                GameStatisticsInput(user_id=request.user.id, kind=kind)
            )
        )


_FIELD_TYPES = {
    "name": serializers.CharField(max_length=120),
    "description": serializers.CharField(allow_blank=True, required=False, default=""),
    "active": serializers.BooleanField(required=False, default=True),
    "premium_price": serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0),
    "starts_at": serializers.DateTimeField(),
    "ends_at": serializers.DateTimeField(),
    "starts_on": serializers.DateField(),
    "ends_on": serializers.DateField(),
    "level": serializers.IntegerField(min_value=1),
    "required_xp": serializers.IntegerField(min_value=0),
    "is_premium": serializers.BooleanField(required=False, default=False),
    "item_id": serializers.IntegerField(min_value=1),
    "item_name": serializers.CharField(max_length=120, allow_blank=True, required=False, default=""),
    "enchant": serializers.IntegerField(min_value=0, required=False, default=0),
    "quantity": serializers.IntegerField(min_value=1),
    "event": serializers.CharField(max_length=80),
    "target": serializers.IntegerField(min_value=1),
    "xp": serializers.IntegerField(min_value=0),
    "period": serializers.CharField(max_length=20),
    "required_item_id": serializers.IntegerField(min_value=1),
    "required_enchant": serializers.IntegerField(min_value=0, required=False, default=0),
    "required_quantity": serializers.IntegerField(min_value=1),
    "rewards": serializers.JSONField(),
    "limit_per_user": serializers.IntegerField(min_value=0, required=False, default=0),
    "day": serializers.IntegerField(min_value=1),
    "weight": serializers.IntegerField(min_value=1),
    "price": serializers.IntegerField(min_value=0),
    "success_bonus": serializers.IntegerField(min_value=0, max_value=90, required=False, default=0),
}


def config_serializer(kind):
    if not known_content_kind(kind):
        raise serializers.ValidationError("Configuração desconhecida.")
    fields = CONFIG_FIELDS[kind]
    attrs = {"id": serializers.UUIDField(read_only=True)}
    for field in fields:
        if field in RELATED_FIELDS:
            attrs[field] = serializers.UUIDField()
        elif field in _FIELD_TYPES:
            attrs[field] = _FIELD_TYPES[field]
        else:
            attrs[field] = serializers.JSONField(required=False)
    return type(f"{kind.replace('-', '_').title()}ConfigSerializer", (serializers.Serializer,), attrs)


class StaffGameContentView(InjectedAPIView):
    """Administra os tipos de conteúdo dos jogos previstos no registro de serializers."""

    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(
        tags=["Staff - Conteúdo de jogos"],
        summary="Listar conteúdo de jogos",
        description="Lista as entradas de configuração do tipo de conteúdo informado.",
    )
    def get(self, request, kind):
        rows = self.resolve(ListGameContentUseCase).execute(ListGameContentInput(kind=kind))
        cls = config_serializer(kind)
        return Response(cls(rows, many=True).data)

    @extend_schema(
        tags=["Staff - Conteúdo de jogos"],
        summary="Criar conteúdo de jogos",
        description="Cria uma nova entrada de configuração para o tipo de conteúdo informado.",
    )
    def post(self, request, kind):
        serializer = config_serializer(kind)(data=request.data)
        serializer.is_valid(raise_exception=True)
        row = self.resolve(UpsertGameContentUseCase).execute(
            UpsertGameContentInput(kind=kind, validated_data=serializer.validated_data)
        )
        return Response(config_serializer(kind)(row).data, status=201)

    @extend_schema(
        tags=["Staff - Conteúdo de jogos"],
        summary="Atualizar conteúdo de jogos",
        description="Atualiza parcialmente uma entrada de configuração identificada pelo tipo e pelo ID.",
    )
    def patch(self, request, kind, entry_id):
        instance = self.resolve(GetGameContentUseCase).execute(
            GetGameContentInput(kind=kind, entry_id=entry_id)
        )
        cls = config_serializer(kind)
        serializer = cls(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        row = self.resolve(UpsertGameContentUseCase).execute(
            UpsertGameContentInput(
                kind=kind,
                validated_data=serializer.validated_data,
                entry_id=entry_id,
            )
        )
        return Response(cls(row).data)
