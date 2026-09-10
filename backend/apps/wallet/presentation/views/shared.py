from decimal import Decimal

from django.utils.translation import gettext_lazy
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.wallet.application.use_cases import (
    GetWalletInput,
    GetWalletUseCase,
    TransferToPlayerInput,
    TransferToPlayerUseCase,
)
from apps.wallet.domain.repositories import IWalletRepository
from apps.wallet.presentation.serializers import TransferSerializer, WalletSerializer
from common.pagination import StandardPagination
from common.views import InjectedAPIView


class WalletView(InjectedAPIView):
    """Entrada HTTP para ``GetWalletUseCase``.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Carteira"],
        summary=gettext_lazy("Consultar carteira"),
        description=gettext_lazy("Retorna o saldo e os dados da carteira do usuário autenticado."),
        responses=WalletSerializer,
    )
    def get(self, request):
        wallet = self.resolve(GetWalletUseCase).execute(GetWalletInput(user_id=request.user.id))
        return Response(WalletSerializer(wallet).data)


class WalletTransferView(InjectedAPIView):
    """Entrada HTTP para ``TransferToPlayerUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Carteira"],
        summary=gettext_lazy("Transferir para jogador"),
        description=gettext_lazy("Transfere moedas da carteira do usuário autenticado para outro jogador."),
        request=TransferSerializer,
        responses=WalletSerializer,
    )
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
    """Entrada HTTP para ``GetWalletUseCase`` e listagem paginada do extrato.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Carteira"],
        summary=gettext_lazy("Listar transações"),
        description=gettext_lazy("Lista o histórico de transações da carteira do usuário autenticado, paginado."),
    )
    def get(self, request):
        wallet = self.resolve(GetWalletUseCase).execute(GetWalletInput(user_id=request.user.id))
        repo = self.resolve(IWalletRepository)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(repo.transaction_rows(wallet.id), request, view=self)
        assert page is not None
        return paginator.get_paginated_response([repo.serialize_transaction(row) for row in page])
