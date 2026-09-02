from django.conf import settings
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.wallet.application.exchange import ExchangeCoinsUseCase, exchange_dump
from apps.wallet.infrastructure.exchange_models import GameExchange
from apps.wallet.infrastructure.models import CoinConfig
from common.views import InjectedAPIView


class ExchangeSerializer(serializers.Serializer):
    request_key = serializers.UUIDField()
    direction = serializers.ChoiceField(choices=["to_game", "from_game"])
    login = serializers.CharField(max_length=45)
    character_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1, max_value=1000000000)


class GameExchangeView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        config = CoinConfig.objects.filter(active=True).first()
        return Response(
            {
                "enabled": settings.LINEAGE_DB_ENABLED
                or getattr(settings, "TESTING", False),
                "coin": {
                    "name": config.name,
                    "item_id": config.coin_id,
                    "multiplier": str(config.multiplier),
                    "withdraw_fee_percent": str(config.withdraw_fee_percent),
                }
                if config
                else None,
                "history": [
                    dict(exchange_dump(r), login=r.login, character_id=r.character_id)
                    for r in GameExchange.objects.filter(user=request.user)[:100]
                ],
            }
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
