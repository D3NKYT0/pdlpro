from dataclasses import asdict

from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.marketplace.application.use_cases import (
    CancelListingInput,
    CancelListingUseCase,
    CreateListingInput,
    CreateListingUseCase,
    ListMyListingsInput,
    ListMyListingsUseCase,
    ListPublicListingsUseCase,
    PurchaseListingInput,
    PurchaseListingUseCase,
)
from apps.marketplace.domain.entities import CharacterListingEntity
from apps.marketplace.presentation.serializers import CreateListingSerializer
from apps.server.presentation.item_metadata import ItemCatalogAPIView


def dump_listing(listing: CharacterListingEntity) -> dict:
    payload = asdict(listing)
    payload["id"] = str(payload["id"])
    payload["seller_id"] = str(payload["seller_id"])
    payload["buyer_id"] = str(payload["buyer_id"]) if payload["buyer_id"] else None
    payload["price"] = str(payload["price"])
    return payload


class PublicMarketplaceView(ItemCatalogAPIView):
    permission_classes = [AllowAny]

    @extend_schema(tags=["Marketplace"])
    def get(self, request):
        listings = self.resolve(ListPublicListingsUseCase).execute(None)
        return Response([dump_listing(listing) for listing in listings])


class MyListingsView(ItemCatalogAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Marketplace"])
    def get(self, request):
        listings = self.resolve(ListMyListingsUseCase).execute(ListMyListingsInput(user_id=request.user.id))
        return Response([dump_listing(listing) for listing in listings])

    @extend_schema(tags=["Marketplace"], request=CreateListingSerializer)
    def post(self, request):
        serializer = CreateListingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        listing = self.resolve(CreateListingUseCase).execute(
            CreateListingInput(
                user_id=request.user.id,
                username=request.user.username,
                login=data.get("login") or request.user.username,
                char_id=data["char_id"],
                price=data["price"],
                notes=data.get("notes") or "",
            )
        )
        return Response(dump_listing(listing))


class PurchaseListingView(ItemCatalogAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Marketplace"])
    def post(self, request, listing_id):
        listing = self.resolve(PurchaseListingUseCase).execute(
            PurchaseListingInput(
                buyer_id=request.user.id,
                buyer_username=request.user.username,
                listing_id=listing_id,
            )
        )
        return Response(dump_listing(listing))


class CancelListingView(ItemCatalogAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Marketplace"])
    def post(self, request, listing_id):
        listing = self.resolve(CancelListingUseCase).execute(
            CancelListingInput(user_id=request.user.id, listing_id=listing_id)
        )
        return Response(dump_listing(listing))
