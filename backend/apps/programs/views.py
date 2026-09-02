from django.db import transaction
from django.db.models import Sum
from django.shortcuts import get_object_or_404
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.programs.models import (
    Commission,
    CommissionPayout,
    RoadmapEntry,
    Supporter,
    SystemResource,
)
from apps.programs.serializers import (
    PayoutReviewSerializer,
    PayoutSerializer,
    ResourceSerializer,
    RoadmapSerializer,
    SupporterReviewSerializer,
    SupporterSerializer,
)
from apps.programs.services import request_commission, review_payout
from apps.shop.infrastructure.models import PromotionCode
from common.permissions import IsStaffMember


class SupporterView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        row = Supporter.objects.filter(user=request.user).first()
        if not row:
            return Response(
                {
                    "profile": None,
                    "available": "0.00",
                    "coupons": [],
                    "payouts": [],
                    "commissions": [],
                }
            )
        commissions = Commission.objects.filter(supporter=row)
        return Response(
            {
                "profile": SupporterSerializer(row, context={"request": request}).data,
                "available": str(
                    commissions.filter(payout__isnull=True).aggregate(
                        total=Sum("amount")
                    )["total"]
                    or 0
                ),
                "coupons": list(
                    PromotionCode.objects.filter(supporter=row).values(
                        "code", "percent", "active", "uses"
                    )
                ),
                "commissions": [
                    {
                        "id": str(c.id),
                        "amount": str(c.amount),
                        "created_at": c.created_at,
                        "status": c.payout.status if c.payout else "available",
                    }
                    for c in commissions.select_related("payout")[:100]
                ],
                "payouts": PayoutSerializer(row.payouts.all()[:100], many=True).data,
            }
        )

    def post(self, request):
        with transaction.atomic():
            # Serialize first-time applications on the user row, too.
            type(request.user).objects.select_for_update().get(pk=request.user.pk)
            row = Supporter.objects.filter(user=request.user).first()
            serializer = SupporterSerializer(
                row, data=request.data, partial=bool(row), context={"request": request}
            )
            serializer.is_valid(raise_exception=True)
            serializer.save(
                user=request.user,
                status="pending" if not row or row.status == "rejected" else row.status,
            )
        return self.get(request)


class RequestPayoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return Response(
            PayoutSerializer(request_commission(request.user)).data, status=201
        )


class StaffSupporterView(APIView):
    permission_classes = [IsAuthenticated, IsStaffMember]

    def get(self, request):
        return Response(
            {
                "supporters": SupporterSerializer(
                    Supporter.objects.select_related("user").all(), many=True
                ).data,
                "payouts": PayoutSerializer(
                    CommissionPayout.objects.select_related("supporter").all()[:200],
                    many=True,
                ).data,
            }
        )

    def patch(self, request, entry_id):
        serializer = SupporterReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            row = get_object_or_404(Supporter.objects.select_for_update(), id=entry_id)
            for key, value in serializer.validated_data.items():
                setattr(row, key, value)
            row.save()
            # Do not replace staff/moderator/admin privileges with a supporter role.
            user = row.user
            if row.status == "approved" and user.role == "player":
                type(user).objects.filter(pk=user.pk, role="player").update(
                    role="supporter"
                )
            elif row.status == "rejected" and user.role == "supporter":
                type(user).objects.filter(pk=user.pk, role="supporter").update(
                    role="player"
                )
        return Response(SupporterSerializer(row).data)


class StaffPayoutView(APIView):
    permission_classes = [IsAuthenticated, IsStaffMember]

    def patch(self, request, entry_id):
        get_object_or_404(CommissionPayout, id=entry_id)
        serializer = PayoutReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(
            PayoutSerializer(
                review_payout(
                    entry_id,
                    serializer.validated_data["status"],
                    serializer.validated_data["note"],
                )
            ).data
        )


class RoadmapView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, entry_id=None):
        rows = RoadmapEntry.objects.filter(published=True)
        if entry_id:
            return Response(
                RoadmapSerializer(get_object_or_404(rows, id=entry_id)).data
            )
        return Response(RoadmapSerializer(rows, many=True).data)


class StaffRoadmapView(APIView):
    permission_classes = [IsAuthenticated, IsStaffMember]

    def get(self, request):
        return Response(RoadmapSerializer(RoadmapEntry.objects.all(), many=True).data)

    def post(self, request):
        serializer = RoadmapSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=201)

    def patch(self, request, entry_id):
        serializer = RoadmapSerializer(
            get_object_or_404(RoadmapEntry, id=entry_id),
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, entry_id):
        get_object_or_404(RoadmapEntry, id=entry_id).delete()
        return Response(status=204)


class ResourceView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            ResourceSerializer(SystemResource.objects.all(), many=True).data
        )


class StaffResourceView(ResourceView):
    permission_classes = [IsAuthenticated, IsStaffMember]

    def patch(self, request, entry_id):
        serializer = ResourceSerializer(
            get_object_or_404(SystemResource, id=entry_id),
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
