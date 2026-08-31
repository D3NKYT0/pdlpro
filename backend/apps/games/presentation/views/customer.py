from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.games.application.use_cases import (
    BuyTokensInput,
    BuyTokensUseCase,
    ClaimDailyBonusInput,
    ClaimDailyBonusUseCase,
    GetBagUseCase,
    GetDailyBonusStateUseCase,
    GetRouletteStateUseCase,
    SpinRouletteInput,
    SpinRouletteUseCase,
)
from apps.games.presentation.serializers import BuyTokensSerializer
from common.views import InjectedAPIView


class RouletteView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Jogos"])
    def get(self, request):
        return Response(self.resolve(GetRouletteStateUseCase).execute(request.user.id))

    @extend_schema(tags=["Jogos"])
    def post(self, request):
        return Response(self.resolve(SpinRouletteUseCase).execute(SpinRouletteInput(user_id=request.user.id)))


class BuyTokensView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Jogos"], request=BuyTokensSerializer)
    def post(self, request):
        serializer = BuyTokensSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(
            self.resolve(BuyTokensUseCase).execute(
                BuyTokensInput(user_id=request.user.id, amount=serializer.validated_data["amount"])
            )
        )


class DailyBonusView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Jogos"])
    def get(self, request):
        return Response(self.resolve(GetDailyBonusStateUseCase).execute(request.user.id))

    @extend_schema(tags=["Jogos"])
    def post(self, request):
        return Response(
            self.resolve(ClaimDailyBonusUseCase).execute(ClaimDailyBonusInput(user_id=request.user.id))
        )


class BagView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Jogos"])
    def get(self, request):
        return Response(self.resolve(GetBagUseCase).execute(request.user.id))
