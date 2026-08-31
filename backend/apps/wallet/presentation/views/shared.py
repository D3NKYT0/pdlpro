from decimal import Decimal

from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.wallet.application.use_cases import GetWalletInput, GetWalletUseCase, TransferToPlayerInput, TransferToPlayerUseCase
from apps.wallet.domain.repositories import IWalletRepository
from apps.wallet.presentation.serializers import TransferSerializer, WalletSerializer
from common.views import InjectedAPIView


class WalletView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Carteira"], responses=WalletSerializer)
    def get(self, request):
        wallet = self.resolve(GetWalletUseCase).execute(GetWalletInput(user_id=request.user.id))
        return Response(WalletSerializer(wallet).data)


class WalletTransferView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Carteira"], request=TransferSerializer, responses=WalletSerializer)
    def post(self, request):
        serializer = TransferSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        wallet = self.resolve(TransferToPlayerUseCase).execute(
            TransferToPlayerInput(
                sender_id=request.user.id,
                recipient_username=data["recipient_username"],
                amount=Decimal(data["amount"]),
                description=data.get("description", ""),
            )
        )
        return Response(WalletSerializer(wallet).data)


class WalletTransactionsView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Carteira"])
    def get(self, request):
        wallet = self.resolve(GetWalletUseCase).execute(GetWalletInput(user_id=request.user.id))
        rows = self.resolve(IWalletRepository).list_transactions(wallet.id)
        return Response({"results": rows})
