"""Webhooks de pagamento guardam só identificadores, sem PII nem client_secret."""

from __future__ import annotations

from uuid import uuid4

from apps.payment.application.webhooks import (
    HandleStripeWebhookInput,
    HandleStripeWebhookUseCase,
    sanitize_webhook_payload,
)


def test_sanitize_webhook_payload_drops_secrets_and_payer_data():
    slim = sanitize_webhook_payload(
        {
            "id": "evt_1",
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_1",
                    "status": "succeeded",
                    "client_secret": "pi_secret_live",
                    "billing_details": {"email": "payer@example.com"},
                    "metadata": {"order_id": "11111111-1111-4111-8111-111111111111"},
                }
            },
        }
    )
    dumped = str(slim)
    assert slim["id"] == "evt_1"
    assert slim["data"]["id"] == "pi_1"
    assert slim["data"]["order_id"] == "11111111-1111-4111-8111-111111111111"
    assert "pi_secret_live" not in dumped
    assert "payer@example.com" not in dumped


class _Logs:
    def __init__(self) -> None:
        self.rows: list[dict] = []

    def create(self, *, kind: str, data_id: str, payload: dict) -> None:
        self.rows.append({"kind": kind, "data_id": data_id, "payload": payload})


def test_stripe_webhook_use_case_stores_sanitized_payload(mocker):
    logs = _Logs()
    apply = mocker.Mock()
    event = {
        "id": "evt_stored",
        "type": "payment_intent.succeeded",
        "data": {
            "object": {
                "id": "pi_stored",
                "client_secret": "keep-out",
                "metadata": {"order_id": str(uuid4())},
            }
        },
    }
    HandleStripeWebhookUseCase(logs, apply).execute(HandleStripeWebhookInput(event=event))
    assert logs.rows[0]["kind"] == "payment_intent.succeeded"
    assert "keep-out" not in str(logs.rows[0]["payload"])
    apply.execute.assert_called_once()
