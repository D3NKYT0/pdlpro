from django.conf import settings
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.wallet.application.exchange import ExchangeCoinsUseCase, GetExchangeStateUseCase
from common.views import InjectedAPIView


class ExchangeSerializer(serializers.Serializer):
    """Valida direção, conta, personagem, quantidade e request_key do câmbio. A chave deve ser
    preservada ao retomar a mesma operação.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``request_key``, ``direction``, ``login``, ``character_id``,
    ``quantity``.
    """

    request_key = serializers.UUIDField()
    direction = serializers.ChoiceField(choices=["to_game", "from_game"])
    login = serializers.CharField(max_length=45)
    character_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1, max_value=1000000000)


class GameExchangeView(InjectedAPIView):
    """Entrada HTTP para ``GetExchangeStateUseCase`` e ``ExchangeCoinsUseCase``.

    Implementa GET, POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a
    resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Carteira"],
        summary="Consultar câmbio com o jogo",
        description=(
            "Retorna se o câmbio está disponível, o motivo de indisponibilidade quando "
            "houver, a configuração da moeda ativa e o histórico recente de trocas do "
            "usuário autenticado."
        ),
    )
    def get(self, request):
        return Response(self.resolve(GetExchangeStateUseCase).execute(request.user.id))

    @extend_schema(
        tags=["Carteira"],
        summary="Executar câmbio de moedas",
        description=(
            "Transfere moedas entre a carteira do portal e o personagem no jogo "
            "(to_game ou from_game). Exige request_key para idempotência."
        ),
        request=ExchangeSerializer,
    )
    def post(self, request):
        serializer = ExchangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not settings.LINEAGE_DB_ENABLED and not getattr(settings, "TESTING", False):
            raise serializers.ValidationError(
                "Conecte o banco do jogo para transferir moedas."
            )
        return Response(
            self.resolve(ExchangeCoinsUseCase).execute(
                request.user, serializer.validated_data
            )
        )
