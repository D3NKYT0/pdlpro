from uuid import UUID

from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.payment.application.use_cases import ApplyGatewayPaymentInput, ApplyGatewayPaymentUseCase
from apps.payment.application.webhooks import WebhookSignatureService
from apps.payment.infrastructure.models import WebhookLog
from apps.payment.infrastructure.mercadopago_gateway import MercadoPagoGateway
from common.views import InjectedAPIView


class MercadoPagoWebhookView(InjectedAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(tags=["Webhooks"])
    def post(self, request):
        if not WebhookSignatureService().mercado_pago_valid(request):
            return Response({"detail": "Assinatura inválida."}, status=400)
        payload = request.data if isinstance(request.data, dict) else {}
        event_id = str(payload.get("id") or request.META.get("HTTP_X_REQUEST_ID") or "")
        data_id = str((payload.get("data") or {}).get("id") or "")
        WebhookLog.objects.create(kind="mercadopago", data_id=event_id or data_id, payload=payload)
        action = payload.get("action") or payload.get("type")
        if action in {"payment.created", "payment", "payment.updated"} and data_id:
            result = self.resolve(MercadoPagoGateway).fetch_by_id(data_id)
            if result and result.status == "approved":
                order_id = None
                metadata = (result.raw or {}).get("metadata") or {}
                if metadata.get("order_id"):
                    try:
                        order_id = UUID(str(metadata["order_id"]))
                    except ValueError:
                        order_id = None
                self.resolve(ApplyGatewayPaymentUseCase).execute(
                    ApplyGatewayPaymentInput(external_id=result.external_id, order_id=order_id, approved=True)
                )
        return Response({"ok": True})


class StripeWebhookView(InjectedAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(tags=["Webhooks"])
    def post(self, request):
        event = WebhookSignatureService().stripe_event(
            request.body, request.META.get("HTTP_STRIPE_SIGNATURE", "")
        )
        if event is None:
            return Response({"detail": "Assinatura inválida."}, status=400)
        WebhookLog.objects.create(kind=event["type"], data_id=event["id"], payload=event)
        if event["type"] in {"payment_intent.succeeded", "checkout.session.completed"}:
            obj = event["data"]["object"]
            external_id = obj.get("id") if event["type"] == "payment_intent.succeeded" else obj.get("payment_intent")
            metadata = obj.get("metadata") or {}
            order_id = None
            if metadata.get("order_id"):
                try:
                    order_id = UUID(str(metadata["order_id"]))
                except ValueError:
                    order_id = None
            self.resolve(ApplyGatewayPaymentUseCase).execute(
                ApplyGatewayPaymentInput(external_id=str(external_id or ""), order_id=order_id, approved=True)
            )
        return Response({"ok": True})
