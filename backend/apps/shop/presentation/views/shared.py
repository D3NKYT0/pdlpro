from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.shop.application.use_cases import (
    AddToCartInput,
    AddToCartUseCase,
    GetCartInput,
    GetCartUseCase,
    ListShopItemsUseCase,
    UpdateCartItemInput,
    UpdateCartItemUseCase,
)
from apps.shop.presentation.serializers import AddToCartSerializer, ShopItemSerializer, UpdateCartItemSerializer
from apps.server.presentation.item_metadata import ItemCatalogAPIView


class ShopCatalogView(ItemCatalogAPIView):
    """Entrada HTTP para ``ListShopItemsUseCase``.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(tags=["Loja"], responses=ShopItemSerializer(many=True))
    def get(self, request):
        items = self.resolve(ListShopItemsUseCase).execute(None)
        return Response(ShopItemSerializer(items, many=True).data)


class ShopCartView(ItemCatalogAPIView):
    """Entrada HTTP para ``AddToCartUseCase``, ``GetCartUseCase``.

    Implementa GET, POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a
    resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Loja"])
    def get(self, request):
        return Response(self.resolve(GetCartUseCase).execute(GetCartInput(user_id=request.user.id)))

    @extend_schema(tags=["Loja"], request=AddToCartSerializer)
    def post(self, request):
        serializer = AddToCartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = self.resolve(AddToCartUseCase).execute(
            AddToCartInput(
                user_id=request.user.id,
                item_id=serializer.validated_data["item_id"],
                quantity=serializer.validated_data["quantity"],
            )
        )
        return Response(result)


class ShopCartItemView(ItemCatalogAPIView):
    """Entrada HTTP para ``UpdateCartItemUseCase``.

    Implementa PATCH, DELETE; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a
    resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Loja"], request=UpdateCartItemSerializer)
    def patch(self, request, cart_item_id):
        serializer = UpdateCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = self.resolve(UpdateCartItemUseCase).execute(
            UpdateCartItemInput(
                user_id=request.user.id,
                cart_item_id=cart_item_id,
                quantity=serializer.validated_data["quantity"],
            )
        )
        return Response(result)

    @extend_schema(tags=["Loja"])
    def delete(self, request, cart_item_id):
        result = self.resolve(UpdateCartItemUseCase).execute(
            UpdateCartItemInput(user_id=request.user.id, cart_item_id=cart_item_id, quantity=0)
        )
        return Response(result)


class ShopCheckoutView(ItemCatalogAPIView):
    """Finaliza a compra pela rotina checkout e devolve o resultado da operação.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated].
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Loja"])
    def post(self, request):
        from rest_framework import serializers
        from apps.shop.application.commerce import checkout

        key = serializers.UUIDField(allow_null=True).run_validation(request.data.get("request_key"))
        result = checkout(request.user.id, key)
        return Response(result)
