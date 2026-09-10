from django.utils.translation import gettext as _
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.payment.application.webhooks import (
    HandleMercadoPagoWebhookInput,
    HandleMercadoPagoWebhookUseCase,
    HandleStripeWebhookInput,
    HandleStripeWebhookUseCase,
    WebhookSignatureService,
)
from common.views import InjectedAPIView


class MercadoPagoWebhookView(InjectedAPIView):
    """Entrada HTTP para validação de assinatura e ``HandleMercadoPagoWebhookUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        tags=["Webhooks"],
        summary="Webhook Mercado Pago",
        description="Recebe eventos do Mercado Pago, valida a assinatura e credita pagamentos aprovados.",
    )
    def post(self, request):
        signatures = self.resolve(WebhookSignatureService)
        if not signatures.mercado_pago_valid(request):
            return Response({"detail": _("Assinatura inválida.")}, status=400)
        payload = request.data if isinstance(request.data, dict) else {}
        self.resolve(HandleMercadoPagoWebhookUseCase).execute(
            HandleMercadoPagoWebhookInput(
                payload=payload,
                request_id=str(request.META.get("HTTP_X_REQUEST_ID") or ""),
            )
        )
        return Response({"ok": True})


class StripeWebhookView(InjectedAPIView):
    """Entrada HTTP para validação de assinatura e ``HandleStripeWebhookUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        tags=["Webhooks"],
        summary="Webhook Stripe",
        description="Recebe eventos do Stripe, valida a assinatura e credita pagamentos concluídos.",
    )
    def post(self, request):
        signatures = self.resolve(WebhookSignatureService)
        event = signatures.stripe_event(
            request.body, request.META.get("HTTP_STRIPE_SIGNATURE", "")
        )
        if event is None:
            return Response({"detail": _("Assinatura inválida.")}, status=400)
        self.resolve(HandleStripeWebhookUseCase).execute(HandleStripeWebhookInput(event=event))
        return Response({"ok": True})
