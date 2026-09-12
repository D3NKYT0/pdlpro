from django.utils.translation import gettext_lazy
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.payment.application.use_cases import (
    StaffConfirmMockPaymentInput,
    StaffConfirmMockPaymentUseCase,
)
from apps.payment.presentation.views.customer import dump_order
from common.permissions import IsStaffMember
from common.views import InjectedAPIView


class StaffConfirmMockPaymentView(InjectedAPIView):
    """Entrada HTTP para ``StaffConfirmMockPaymentUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated, IsStaffMember]. Resolve a aplicação no escopo da requisição antes de
    montar a resposta.
    """

    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(
        tags=["Staff / Financeiro"],
        summary=gettext_lazy("Confirmar pagamento simulado"),
        description=gettext_lazy(
            "Credita a carteira de um pedido mock pendente. Não confirma Mercado Pago nem Stripe. "
            "Use somente em desenvolvimento ou para regularizar uma simulação consciente."
        ),
    )
    def post(self, request, order_id):
        order = self.resolve(StaffConfirmMockPaymentUseCase).execute(
            StaffConfirmMockPaymentInput(order_id=order_id)
        )
        return Response(dump_order(order))
