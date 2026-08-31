from dataclasses import asdict

from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.auction.application.use_cases import (
    CloseExpiredAuctionsUseCase,
    CreateAuctionInput,
    CreateAuctionUseCase,
    ListMyAuctionsInput,
    ListMyAuctionsUseCase,
    ListOpenAuctionsUseCase,
    PlaceBidInput,
    PlaceBidUseCase,
)
from apps.auction.domain.entities import AuctionEntity, BidEntity
from apps.auction.presentation.serializers import CreateAuctionSerializer, PlaceBidSerializer
from common.views import InjectedAPIView


def dump_auction(auction: AuctionEntity) -> dict:
    payload = asdict(auction)
    payload["id"] = str(payload["id"])
    payload["seller_id"] = str(payload["seller_id"])
    payload["highest_bidder_id"] = str(payload["highest_bidder_id"]) if payload["highest_bidder_id"] else None
    payload["min_bid"] = str(payload["min_bid"])
    payload["current_bid"] = str(payload["current_bid"]) if payload["current_bid"] is not None else None
    payload["ends_at"] = payload["ends_at"].isoformat()
    return payload


def dump_bid(bid: BidEntity) -> dict:
    return {
        "id": str(bid.id),
        "auction_id": str(bid.auction_id),
        "bidder_id": str(bid.bidder_id),
        "amount": str(bid.amount),
        "character_name": bid.character_name,
    }


class PublicAuctionListView(InjectedAPIView):
    permission_classes = [AllowAny]

    @extend_schema(tags=["Leilão"])
    def get(self, request):
        self.resolve(CloseExpiredAuctionsUseCase).execute(None)
        auctions = self.resolve(ListOpenAuctionsUseCase).execute(None)
        return Response([dump_auction(auction) for auction in auctions])


class MyAuctionsView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Leilão"])
    def get(self, request):
        auctions = self.resolve(ListMyAuctionsUseCase).execute(ListMyAuctionsInput(user_id=request.user.id))
        return Response([dump_auction(auction) for auction in auctions])

    @extend_schema(tags=["Leilão"], request=CreateAuctionSerializer)
    def post(self, request):
        serializer = CreateAuctionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        auction = self.resolve(CreateAuctionUseCase).execute(
            CreateAuctionInput(
                user_id=request.user.id,
                inventory_id=data["inventory_id"],
                item_id=data["item_id"],
                quantity=data["quantity"],
                enchant=data.get("enchant") or 0,
                min_bid=data["min_bid"],
                hours=data.get("hours") or 24,
            )
        )
        return Response(dump_auction(auction))


class PlaceBidView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Leilão"], request=PlaceBidSerializer)
    def post(self, request, auction_id):
        serializer = PlaceBidSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        bid = self.resolve(PlaceBidUseCase).execute(
            PlaceBidInput(
                user_id=request.user.id,
                auction_id=auction_id,
                amount=serializer.validated_data["amount"],
                character_name=serializer.validated_data["character_name"],
            )
        )
        return Response(dump_bid(bid))
