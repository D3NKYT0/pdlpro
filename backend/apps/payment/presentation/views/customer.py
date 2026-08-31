from dataclasses import asdict

from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.payment.application.use_cases import (
    CancelPaymentOrderInput,
    CancelPaymentOrderUseCase,
    ConfirmPaymentInput,
    ConfirmPaymentUseCase,
    CreatePaymentOrderInput,
    CreatePaymentOrderUseCase,
    ListPaymentOrdersInput,
    ListPaymentOrdersUseCase,
    PreviewBonusInput,
    PreviewPaymentBonusUseCase,
)
from apps.payment.domain.entities import PaymentOrderEntity
from apps.payment.presentation.serializers import CreatePaymentOrderSerializer, PreviewBonusSerializer
from common.views import InjectedAPIView


def dump_order(order: PaymentOrderEntity) -> dict:
    payload = asdict(order)
    payload["id"] = str(payload["id"])
    payload["user_id"] = str(payload["user_id"])
    for key in ("amount", "coins", "bonus_applied", "total_credited"):
        payload[key] = str(payload[key])
    return payload


class PaymentOrderListView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Pagamento"])
    def get(self, request):
        orders = self.resolve(ListPaymentOrdersUseCase).execute(ListPaymentOrdersInput(user_id=request.user.id))
        return Response([dump_order(order) for order in orders])

    @extend_schema(tags=["Pagamento"], request=CreatePaymentOrderSerializer)
    def post(self, request):
        serializer = CreatePaymentOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = self.resolve(CreatePaymentOrderUseCase).execute(
            CreatePaymentOrderInput(
                user_id=request.user.id,
                amount=serializer.validated_data["amount"],
                method=serializer.validated_data.get("method") or "mock",
            )
        )
        return Response(dump_order(order))


class PreviewPaymentBonusView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Pagamento"], request=PreviewBonusSerializer)
    def post(self, request):
        serializer = PreviewBonusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        preview = self.resolve(PreviewPaymentBonusUseCase).execute(
            PreviewBonusInput(amount=serializer.validated_data["amount"])
        )
        return Response(
            {
                "amount": str(preview.amount),
                "bonus": str(preview.bonus),
                "percent": str(preview.percent),
                "description": preview.description,
                "total": str(preview.total),
            }
        )


class CancelPaymentOrderView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Pagamento"])
    def post(self, request, order_id):
        order = self.resolve(CancelPaymentOrderUseCase).execute(
            CancelPaymentOrderInput(user_id=request.user.id, order_id=order_id)
        )
        return Response(dump_order(order))


class ConfirmPaymentOrderView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Pagamento"])
    def post(self, request, order_id):
        order = self.resolve(ConfirmPaymentUseCase).execute(
            ConfirmPaymentInput(order_id=order_id, user_id=request.user.id)
        )
        return Response(dump_order(order))
