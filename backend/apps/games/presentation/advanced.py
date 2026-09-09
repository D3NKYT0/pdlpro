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
from apps.games.application.staff_content_use_cases import (
    ListGameContentInput,
    ListGameContentUseCase,
    UpsertGameContentInput,
    UpsertGameContentUseCase,
)
from apps.games.domain.repositories import IGameContentAdminRepository
from apps.games.infrastructure.staff_content import CONFIG_MODELS
from common.architecture.exceptions import EntityNotFoundError
from common.permissions import IsStaffMember
from common.views import InjectedAPIView


class BattleActionSerializer(serializers.Serializer):
    """Valida a ação e os identificadores do conteúdo adicional do passe de batalha.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``action``, ``entry_id``, ``enabled``.
    """

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
    """Consulta o conteúdo adicional do passe e encaminha ações validadas ao serviço de batalha.

    Implementa GET, POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated].
    """

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
    """Consulta o calendário e os detalhes do bônus diário para o jogador.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated].
    """

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
    """Valida a seleção e a quantidade de iscas para compra.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``bait_id``, ``quantity``.
    """

    bait_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1, max_value=999, default=1)


class FishingDetailsView(InjectedAPIView):
    """Lista iscas, estoque e capturas do usuário e permite comprar iscas.

    Implementa GET, POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated].
    """

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
    """Expõe as estatísticas produzidas pelo serviço de jogos.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated].
    """

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


def config_serializer(kind):
    if kind not in CONFIG_MODELS:
        raise serializers.ValidationError("Configuração desconhecida.")
    model, fields = CONFIG_MODELS[kind]

    class RelatedUUIDField(serializers.Field):
        """Aceita UUID na entrada; na saída serializa o ``id`` público do relacionado."""

        def to_internal_value(self, data):
            return serializers.UUIDField().to_internal_value(data)

        def to_representation(self, value):
            if value is None:
                return None
            return getattr(value, "id", value)

    class ConfigSerializer(serializers.ModelSerializer):
        class Meta:
            pass

    ConfigSerializer.Meta.model = model
    ConfigSerializer.Meta.fields = ["id", *fields]
    ConfigSerializer.Meta.read_only_fields = ["id"]
    ConfigSerializer.Meta.extra_kwargs = (
        {"premium_price": {"min_value": 0}} if kind == "seasons" else {}
    )
    for field in fields:
        model_field = model._meta.get_field(field)
        if model_field.many_to_one:
            # FK validada no caso de uso via IGameContentAdminRepository.resolve_related.
            ConfigSerializer._declared_fields[field] = RelatedUUIDField()
    return ConfigSerializer


class StaffGameContentView(InjectedAPIView):
    """Administra os tipos de conteúdo dos jogos previstos no registro de serializers.

    Implementa GET, POST, PATCH; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated, IsStaffMember].
    """

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
        instance = self.resolve(IGameContentAdminRepository).get_kind(kind, entry_id)
        if instance is None:
            raise EntityNotFoundError("Entrada de configuração não encontrada.")
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
