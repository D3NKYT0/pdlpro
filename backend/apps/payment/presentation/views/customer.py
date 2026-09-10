from dataclasses import asdict
from uuid import UUID

from django.utils.translation import gettext_lazy
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
    GetPaymentCatalogUseCase,
    GetPaymentStatusInput,
    GetPaymentStatusUseCase,
    PreviewBonusInput,
    PreviewPaymentBonusUseCase,
    ProcessPaymentInput,
    ProcessPaymentUseCase,
)
from apps.payment.domain.entities import PaymentOrderEntity
from apps.payment.domain.repositories import IPaymentOrderRepository
from apps.payment.presentation.serializers import (
    CreatePaymentOrderSerializer,
    PreviewBonusSerializer,
)
from common.pagination import StandardPagination
from common.views import InjectedAPIView


def dump_order(order: PaymentOrderEntity) -> dict:
    payload = asdict(order)
    payload["id"] = str(payload["id"])
    payload["user_id"] = str(payload["user_id"])
    for key in ("amount", "coins", "bonus_applied", "total_credited"):
        payload[key] = str(payload[key])
    for key in ("created_at", "paid_at"):
        value = payload.get(key)
        payload[key] = value.isoformat() if value else None
    gateway = payload.pop("gateway_data", {}) or {}
    payload["pix_qr_code"] = gateway.get("pix_qr_code") or ""
    payload["pix_qr_code_base64"] = gateway.get("pix_qr_code_base64") or ""
    payload["pix_ticket_url"] = gateway.get("pix_ticket_url") or ""
    payload["boleto_url"] = gateway.get("boleto_url") or ""
    payload["boleto_barcode"] = gateway.get("boleto_barcode") or ""
    payload["gateway_message"] = gateway.get("message") or ""
    return payload


class PaymentCatalogView(InjectedAPIView):
    """Entrada HTTP para ``GetPaymentCatalogUseCase``.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Pagamento"],
        summary=gettext_lazy("Catálogo de pagamento"),
        description=gettext_lazy("Retorna pacotes, métodos e regras disponíveis para criação de pedidos de pagamento."),
    )
    def get(self, request):
        catalog = self.resolve(GetPaymentCatalogUseCase).execute()
        return Response(catalog)


class PaymentOrderListView(InjectedAPIView):
    """Entrada HTTP para listagem paginada de pedidos e ``CreatePaymentOrderUseCase``.

    Implementa GET, POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a
    resposta. O GET pagina com ``StandardPagination`` sobre os pedidos do usuário autenticado.
    """

    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination

    @extend_schema(
        tags=["Pagamento"],
        summary=gettext_lazy("Listar pedidos de pagamento"),
        description=gettext_lazy("Lista os pedidos de pagamento do usuário autenticado, paginados."),
    )
    def get(self, request):
        repo = self.resolve(IPaymentOrderRepository)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(repo.order_rows(request.user.id), request, view=self)
        assert page is not None
        return paginator.get_paginated_response([dump_order(repo.to_entity(row)) for row in page])

    @extend_schema(
        tags=["Pagamento"],
        summary=gettext_lazy("Criar pedido de pagamento"),
        description=gettext_lazy("Cria um novo pedido de pagamento para o usuário autenticado."),
        request=CreatePaymentOrderSerializer,
    )
    def post(self, request):
        serializer = CreatePaymentOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        order = self.resolve(CreatePaymentOrderUseCase).execute(
            CreatePaymentOrderInput(
                user_id=request.user.id,
                amount=data.get("amount"),
                method=data.get("method") or "",
                currency=data.get("currency") or "BRL",
                package_id=data.get("package_id") or "",
            )
        )
        return Response(dump_order(order))


class PreviewPaymentBonusView(InjectedAPIView):
    """Entrada HTTP para ``PreviewPaymentBonusUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Pagamento"],
        summary=gettext_lazy("Prévia de bônus"),
        description=gettext_lazy("Calcula a prévia de bônus e créditos para o valor ou pacote informado."),
        request=PreviewBonusSerializer,
    )
    def post(self, request):
        serializer = PreviewBonusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        return Response(
            self.resolve(PreviewPaymentBonusUseCase).execute(
                PreviewBonusInput(
                    amount=data.get("amount") or 0,
                    currency=data.get("currency") or "BRL",
                    package_id=data.get("package_id") or "",
                )
            )
        )


class CancelPaymentOrderView(InjectedAPIView):
    """Entrada HTTP para ``CancelPaymentOrderUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Pagamento"],
        summary=gettext_lazy("Cancelar pedido"),
        description=gettext_lazy("Cancela o pedido de pagamento informado pertencente ao usuário autenticado."),
    )
    def post(self, request, order_id):
        order = self.resolve(CancelPaymentOrderUseCase).execute(
            CancelPaymentOrderInput(user_id=request.user.id, order_id=order_id)
        )
        return Response(dump_order(order))


class ConfirmPaymentOrderView(InjectedAPIView):
    """Entrada HTTP para ``ConfirmPaymentUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Pagamento"],
        summary=gettext_lazy("Confirmar pagamento"),
        description=gettext_lazy("Confirma o pagamento do pedido informado para o usuário autenticado."),
    )
    def post(self, request, order_id):
        order = self.resolve(ConfirmPaymentUseCase).execute(
            ConfirmPaymentInput(order_id=order_id, user_id=request.user.id)
        )
        return Response(dump_order(order))


class ProcessPaymentOrderView(InjectedAPIView):
    """Entrada HTTP para ``ProcessPaymentUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Pagamento"],
        summary=gettext_lazy("Processar pagamento"),
        description=gettext_lazy("Envia o pedido ao gateway e devolve dados de cobrança como PIX ou boleto."),
    )
    def post(self, request, order_id):
        outcome = self.resolve(ProcessPaymentUseCase).execute(
            ProcessPaymentInput(
                user_id=request.user.id,
                order_id=order_id,
                payload=request.data if isinstance(request.data, dict) else {},
                payer_email=request.user.email,
            )
        )
        order = dump_order(outcome["order"])
        result = outcome["result"]
        order["status_detail"] = result.status
        order["pix_qr_code"] = result.pix_qr_code or order["pix_qr_code"]
        order["pix_qr_code_base64"] = result.pix_qr_code_base64 or order["pix_qr_code_base64"]
        order["pix_ticket_url"] = result.pix_ticket_url or order["pix_ticket_url"]
        order["boleto_url"] = result.boleto_url or order["boleto_url"]
        order["boleto_barcode"] = result.boleto_barcode or order["boleto_barcode"]
        order["gateway_message"] = result.message or order["gateway_message"]
        return Response(order)


class PaymentOrderStatusView(InjectedAPIView):
    """Entrada HTTP para ``GetPaymentStatusUseCase``.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Pagamento"],
        summary=gettext_lazy("Status do pedido"),
        description=gettext_lazy("Consulta o status atual do pedido de pagamento informado."),
    )
    def get(self, request, order_id: UUID):
        order = self.resolve(GetPaymentStatusUseCase).execute(
            GetPaymentStatusInput(user_id=request.user.id, order_id=order_id)
        )
        return Response(dump_order(order))
