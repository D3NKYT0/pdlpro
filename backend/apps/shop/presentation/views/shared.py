from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.shop.application.use_cases import (
    AddToCartInput,
    AddToCartUseCase,
    CheckoutInput,
    CheckoutUseCase,
    ListShopItemsUseCase,
)
from apps.shop.presentation.serializers import AddToCartSerializer, ShopItemSerializer
from common.views import InjectedAPIView


class ShopCatalogView(InjectedAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(tags=["Loja"], responses=ShopItemSerializer(many=True))
    def get(self, request):
        items = self.resolve(ListShopItemsUseCase).execute(None)
        return Response(ShopItemSerializer(items, many=True).data)


class ShopCartView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

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


class ShopCheckoutView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Loja"])
    def post(self, request):
        result = self.resolve(CheckoutUseCase).execute(CheckoutInput(user_id=request.user.id))
        return Response(result)
