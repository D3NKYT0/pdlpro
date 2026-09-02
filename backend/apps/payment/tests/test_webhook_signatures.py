"""Assinaturas são verificadas sem enviar requisições a provedores reais."""
import hashlib
import hmac
from datetime import datetime, timezone

import pytest
from django.test import RequestFactory

from apps.payment.application.webhooks import WebhookSignatureService


@pytest.fixture
def signed_request(settings, monkeypatch):
    settings.MERCADO_PAGO_WEBHOOK_SECRET = "test-secret"
    now = 1700000000
    monkeypatch.setattr("apps.payment.application.webhooks.timezone.now", lambda: datetime.fromtimestamp(now, timezone.utc))
    def make(*, age=0, data_id="123", query=True):
        ts = str(now - age)
        digest = hmac.new(b"test-secret", f"id:{data_id};request-id:req-1;ts:{ts};".encode(), hashlib.sha256).hexdigest()
        return RequestFactory().post(
            f"/webhook/?data.id={data_id}" if query else "/webhook/",
            {"data": {"id": data_id}}, content_type="application/json",
            HTTP_X_SIGNATURE=f"ts={ts},v1={digest}", HTTP_X_REQUEST_ID="req-1",
        )
    return make


@pytest.mark.parametrize("age", [0, 300, -300])
@pytest.mark.parametrize("query", [True, False])
def test_valid_signature_includes_boundary_timestamps(signed_request, age, query):
    assert WebhookSignatureService().mercado_pago_valid(signed_request(age=age, query=query))


@pytest.mark.parametrize("age", [301, -301, 86400])
def test_expired_or_future_signature_is_rejected(signed_request, age):
    assert not WebhookSignatureService().mercado_pago_valid(signed_request(age=age))


@pytest.mark.parametrize("signature", ["", "bad", "ts=1700000000", "v1=abc", "ts=invalid,v1=abc", "ts=1700000000,v1=abc"])
def test_invalid_signature_is_rejected(signed_request, signature):
    request = signed_request()
    request.META["HTTP_X_SIGNATURE"] = signature
    assert not WebhookSignatureService().mercado_pago_valid(request)


def test_payload_tampering_is_rejected(signed_request):
    request = signed_request()
    request.META["QUERY_STRING"] = "data.id=999"
    assert not WebhookSignatureService().mercado_pago_valid(request)


def test_secret_is_required(signed_request, settings):
    request = signed_request()
    settings.MERCADO_PAGO_WEBHOOK_SECRET = ""
    assert not WebhookSignatureService().mercado_pago_valid(request)


@pytest.mark.parametrize("payload", [b"{", b"{}", b'{"data":{}}'])
def test_missing_or_invalid_body_fails_closed(signed_request, payload):
    request = signed_request(query=False)
    request._body = payload
    assert not WebhookSignatureService().mercado_pago_valid(request)


def test_stripe_passes_raw_body_and_signature_to_sdk(settings, mocker):
    settings.STRIPE_WEBHOOK_SECRET = "whsec-test"
    event = {"type": "payment_intent.succeeded"}
    verify = mocker.patch("stripe.Webhook.construct_event", return_value=event)
    assert WebhookSignatureService().stripe_event(b'{"id":"evt"}', "signature") == event
    verify.assert_called_once_with(b'{"id":"evt"}', "signature", "whsec-test")


def test_stripe_invalid_signature_never_returns_event(settings, mocker):
    settings.STRIPE_WEBHOOK_SECRET = "whsec-test"
    mocker.patch("stripe.Webhook.construct_event", side_effect=ValueError("invalid"))
    assert WebhookSignatureService().stripe_event(b"{}", "bad") is None


def test_stripe_without_secret_does_not_call_sdk(settings, mocker):
    settings.STRIPE_WEBHOOK_SECRET = ""
    verify = mocker.patch("stripe.Webhook.construct_event")
    assert WebhookSignatureService().stripe_event(b"{}", "bad") is None
    verify.assert_not_called()
