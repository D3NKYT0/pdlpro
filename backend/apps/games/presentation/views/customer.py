from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.games.application.battle_pass_use_cases import (
    BuyBattlePassPremiumInput,
    BuyBattlePassPremiumUseCase,
    ClaimBattlePassRewardInput,
    ClaimBattlePassRewardUseCase,
    GetBattlePassUseCase,
)
from apps.games.application.economy_use_cases import (
    EnchantWeaponInput,
    EnchantWeaponUseCase,
    FightMonsterInput,
    FightMonsterUseCase,
    GetEconomyStateUseCase,
)
from apps.games.application.fishing_use_cases import CastLineInput, CastLineUseCase, GetFishingStateUseCase
from apps.games.application.box_use_cases import (
    BuyBoxInput,
    BuyBoxUseCase,
    ListBoxTypesUseCase,
    OpenBoxInput,
    OpenBoxUseCase,
    TransferBagInput,
    TransferBagToInventoryUseCase,
)
from apps.games.application.minigame_use_cases import (
    GetMinigamesStateUseCase,
    PlayDiceInput,
    PlayDiceUseCase,
    SpinSlotsInput,
    SpinSlotsUseCase,
)
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
from apps.games.presentation.serializers import (
    BuyBoxSerializer,
    BuyTokensSerializer,
    PlayDiceSerializer,
    TransferBagSerializer,
)
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

    @extend_schema(tags=["Jogos"], request=TransferBagSerializer)
    def post(self, request):
        serializer = TransferBagSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(
            self.resolve(TransferBagToInventoryUseCase).execute(
                TransferBagInput(user_id=request.user.id, inventory_id=serializer.validated_data["inventory_id"])
            )
        )


class BoxListView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Jogos"])
    def get(self, request):
        return Response(self.resolve(ListBoxTypesUseCase).execute(request.user.id))

    @extend_schema(tags=["Jogos"], request=BuyBoxSerializer)
    def post(self, request):
        serializer = BuyBoxSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(
            self.resolve(BuyBoxUseCase).execute(
                BuyBoxInput(user_id=request.user.id, box_type_id=serializer.validated_data["box_type_id"])
            )
        )


class OpenBoxView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Jogos"])
    def post(self, request, box_id):
        return Response(self.resolve(OpenBoxUseCase).execute(OpenBoxInput(user_id=request.user.id, box_id=box_id)))


class MinigamesView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Jogos"])
    def get(self, request):
        return Response(self.resolve(GetMinigamesStateUseCase).execute(request.user.id))


class DiceView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Jogos"], request=PlayDiceSerializer)
    def post(self, request):
        serializer = PlayDiceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(
            self.resolve(PlayDiceUseCase).execute(
                PlayDiceInput(user_id=request.user.id, **serializer.validated_data)
            )
        )


class SlotsView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Jogos"])
    def post(self, request):
        return Response(self.resolve(SpinSlotsUseCase).execute(SpinSlotsInput(user_id=request.user.id)))


class FishingView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Jogos"])
    def get(self, request):
        return Response(self.resolve(GetFishingStateUseCase).execute(request.user.id))

    @extend_schema(tags=["Jogos"])
    def post(self, request):
        return Response(self.resolve(CastLineUseCase).execute(CastLineInput(user_id=request.user.id)))


class EconomyView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Jogos"])
    def get(self, request):
        return Response(self.resolve(GetEconomyStateUseCase).execute(request.user.id))


class FightMonsterView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Jogos"])
    def post(self, request, monster_id):
        return Response(
            self.resolve(FightMonsterUseCase).execute(
                FightMonsterInput(user_id=request.user.id, monster_id=monster_id)
            )
        )


class EnchantWeaponView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Jogos"])
    def post(self, request):
        return Response(self.resolve(EnchantWeaponUseCase).execute(EnchantWeaponInput(user_id=request.user.id)))


class BattlePassView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Jogos"])
    def get(self, request):
        return Response(self.resolve(GetBattlePassUseCase).execute(request.user.id))

    @extend_schema(tags=["Jogos"])
    def post(self, request):
        return Response(
            self.resolve(BuyBattlePassPremiumUseCase).execute(BuyBattlePassPremiumInput(user_id=request.user.id))
        )


class ClaimBattlePassView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Jogos"])
    def post(self, request, reward_id):
        return Response(
            self.resolve(ClaimBattlePassRewardUseCase).execute(
                ClaimBattlePassRewardInput(user_id=request.user.id, reward_id=reward_id)
            )
        )
