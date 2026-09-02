from __future__ import annotations

import logging
import re
import uuid
from typing import Any

from django.conf import settings
from mercadopago.config import RequestOptions

from apps.payment.domain.entities import CheckoutSession, PaymentOrderEntity, ProcessResult
from apps.payment.domain.exceptions import PaymentGatewayError, PaymentMethodUnavailableError
from apps.payment.domain.gateways import IPaymentGateway

logger = logging.getLogger(__name__)


class MercadoPagoGateway(IPaymentGateway):
    """Adaptador de IPaymentGateway para pagamentos via Mercado Pago.

    Obtenha a instância pelo PaymentGatewayRegistry. Encapsula criação do checkout,
    processamento e consulta de status; os casos de uso aplicam os resultados ao pedido e à
    carteira. Depende das credenciais configuradas e não valida, por si só, a assinatura das
    requisições de webhook.
    """

    method_name = "mercadopago"

    def is_available(self) -> bool:
        return bool(
            getattr(settings, "MERCADO_PAGO_ACTIVATE_PAYMENTS", False)
            and getattr(settings, "MERCADO_PAGO_ACCESS_TOKEN", "")
            and getattr(settings, "MERCADO_PAGO_PUBLIC_KEY", "")
        )

    def public_key(self) -> str:
        return getattr(settings, "MERCADO_PAGO_PUBLIC_KEY", "") or ""

    def create_checkout(self, order: PaymentOrderEntity) -> CheckoutSession:
        if not self.is_available():
            raise PaymentMethodUnavailableError("Mercado Pago não está habilitado.")
        return CheckoutSession(
            external_id="",
            checkout_url="",
            public_key=self.public_key(),
        )

    def process_payment(self, order: PaymentOrderEntity, payload: dict) -> ProcessResult:
        if not self.is_available():
            raise PaymentMethodUnavailableError("Mercado Pago não está habilitado.")
        import mercadopago

        payer = payload.get("payer") if isinstance(payload.get("payer"), dict) else {}
        identification = payer.get("identification") if isinstance(payer.get("identification"), dict) else {}
        document_type = str(identification.get("type") or "").upper()
        document_number = re.sub(r"\D", "", str(identification.get("number") or ""))
        if document_type not in {"CPF", "CNPJ"} or not document_number:
            raise PaymentGatewayError("Informe um CPF ou CNPJ válido para o Mercado Pago.")

        payment_data: dict[str, Any] = {
            "transaction_amount": float(order.amount),
            "description": f"Moedas PDL ({order.package_code or 'custom'})",
            "payment_method_id": payload.get("payment_method_id"),
            "payer": {
                "email": payer.get("email") or "",
                "identification": {"type": document_type, "number": document_number},
            },
            "external_reference": f"pdl_coins_{order.id}",
            "metadata": {"order_id": str(order.id), "user_id": str(order.user_id), "coins": str(order.coins)},
        }
        if payload.get("token"):
            payment_data["token"] = payload["token"]
            payment_data["installments"] = int(payload.get("installments") or 1)
            if payload.get("issuer_id"):
                payment_data["issuer_id"] = payload["issuer_id"]
        if isinstance(payer.get("address"), dict):
            payment_data["payer"]["address"] = payer["address"]
        notify = getattr(settings, "PAYMENT_WEBHOOK_BASE_URL", "") or getattr(settings, "PROJECT_URL", "")
        if notify:
            payment_data["notification_url"] = f"{str(notify).rstrip('/')}/api/v1/system/webhooks/mercadopago/"

        sdk = mercadopago.SDK(settings.MERCADO_PAGO_ACCESS_TOKEN)
        response = sdk.payment().create(payment_data, RequestOptions(custom_headers={"x-idempotency-key": str(uuid.uuid4())}))
        if response.get("status", 500) >= 400:
            logger.error("Mercado Pago recusou o pagamento %s: %s", order.id, response.get("response"))
            message = self._error_message(response.get("response") or {})
            raise PaymentGatewayError(message)
        mp_payment = response.get("response") or {}
        return self._to_result(mp_payment)

    def fetch_by_id(self, payment_id: str) -> ProcessResult | None:
        if not payment_id or not self.is_available():
            return None
        import mercadopago

        sdk = mercadopago.SDK(settings.MERCADO_PAGO_ACCESS_TOKEN)
        info = sdk.payment().get(payment_id)
        if info.get("status") != 200:
            return None
        return self._to_result(info.get("response") or {})

    def fetch_status(self, order: PaymentOrderEntity) -> ProcessResult | None:
        return self.fetch_by_id(order.external_id)

    def _to_result(self, mp_payment: dict) -> ProcessResult:
        mp_status = mp_payment.get("status") or "pending"
        mapped = {"approved": "approved", "rejected": "rejected", "cancelled": "rejected"}.get(mp_status, "pending")
        transaction_data = (mp_payment.get("point_of_interaction") or {}).get("transaction_data") or {}
        details = mp_payment.get("transaction_details") or {}
        barcode = mp_payment.get("barcode") or {}
        return ProcessResult(
            status=mapped,
            external_id=str(mp_payment.get("id") or ""),
            pix_qr_code=transaction_data.get("qr_code") or "",
            pix_qr_code_base64=transaction_data.get("qr_code_base64") or "",
            pix_ticket_url=transaction_data.get("ticket_url") or "",
            boleto_url=details.get("external_resource_url") or "",
            boleto_barcode=(barcode.get("content") if isinstance(barcode, dict) else "") or "",
            message=str(mp_payment.get("status_detail") or ""),
            raw=mp_payment,
        )

    def _error_message(self, payload: dict) -> str:
        cause = payload.get("cause")
        if isinstance(cause, list) and cause:
            first = cause[0]
            if isinstance(first, dict) and first.get("description"):
                return str(first["description"])
        return str(payload.get("message") or "Não foi possível processar o pagamento no Mercado Pago.")
