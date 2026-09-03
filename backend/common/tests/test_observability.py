import json
import logging
from types import SimpleNamespace

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.test import RequestFactory
from rest_framework.test import APIClient

from apps.staff.infrastructure.models import AuditLog
from common.middleware import ObservabilityMiddleware, RequestIdMiddleware
from common.observability import JsonFormatter, RequestContextFilter, request_id_context


def test_request_id_is_propagated_to_response_and_logging_context():
    records = []

    class CaptureHandler(logging.Handler):
        def emit(self, record):
            records.append(record)

    app_logger = logging.getLogger("apps.test")
    handler = CaptureHandler()
    handler.addFilter(RequestContextFilter())
    app_logger.addHandler(handler)

    def endpoint(request):
        app_logger.info("inside request")
        return JsonResponse({"ok": True})

    request = RequestFactory().get("/api/v1/system/health/", HTTP_X_REQUEST_ID="trace-123")
    try:
        response = RequestIdMiddleware(endpoint)(request)
    finally:
        app_logger.removeHandler(handler)

    assert response["X-Request-ID"] == "trace-123"
    assert records[-1].request_id == "trace-123"
    assert request_id_context.get() == ""


@pytest.mark.parametrize("request_id", ["spaces are invalid", "x" * 129, "token\nforged"])
def test_request_id_replaces_invalid_untrusted_values(request_id):
    request = RequestFactory().get("/", HTTP_X_REQUEST_ID=request_id)
    response = RequestIdMiddleware(lambda request: JsonResponse({"ok": True}))(request)

    assert len(response["X-Request-ID"]) == 32
    assert response["X-Request-ID"].isalnum()


def test_json_formatter_emits_structured_redacted_context():
    record = logging.LogRecord("apps.payment", logging.INFO, __file__, 10, "processed %s", ("event",), None)
    record.request_id = "trace-123"
    record.event = "payment.processed"
    record.metadata = {"token": "private", "nested": {"password": "private"}, "safe": "value"}

    payload = json.loads(JsonFormatter(service="pdl-api", environment="test").format(record))

    assert payload["message"] == "processed event"
    assert payload["service"] == "pdl-api"
    assert payload["environment"] == "test"
    assert payload["request_id"] == "trace-123"
    assert payload["event"] == "payment.processed"
    assert payload["metadata"] == {
        "token": "[REDACTED]",
        "nested": {"password": "[REDACTED]"},
        "safe": "value",
    }


@pytest.mark.django_db
def test_staff_write_creates_metadata_only_audit_event(caplog):
    user = get_user_model().objects.create_user(
        username="auditor", email="auditor@example.com", password="never-log-this", is_staff=True
    )
    request = RequestFactory().patch(
        "/api/v1/staff/custom-items/4ebfb08b-6181-4328-88d0-fd606db60ec6/",
        data={"password": "must-not-be-recorded", "name": "item"},
        content_type="application/json",
        HTTP_X_FORWARDED_FOR="203.0.113.10, 10.0.0.4",
    )
    request.user = user
    request.request_id = "trace-staff"
    request.resolver_match = SimpleNamespace(
        view_name="staff-custom-item-detail",
        route="api/v1/staff/custom-items/<uuid:item_uuid>/",
        kwargs={"item_uuid": "4ebfb08b-6181-4328-88d0-fd606db60ec6"},
    )

    response = ObservabilityMiddleware(lambda request: JsonResponse({"ok": True}))(request)
    audit = AuditLog.objects.get()

    assert response.status_code == 200
    assert audit.actor == user
    assert audit.action == "staff-custom-item-detail:patch"
    assert audit.request_id == "trace-staff"
    assert audit.ip_address == "203.0.113.10"
    assert audit.target_id == "4ebfb08b-6181-4328-88d0-fd606db60ec6"
    assert audit.payload == {"outcome": "success"}
    assert "must-not-be-recorded" not in str(audit.__dict__)

    audit.status_code = 201
    with pytest.raises(ValidationError, match="imutáveis"):
        audit.save()
    with pytest.raises(ValidationError, match="retenção"):
        audit.delete()


@pytest.mark.django_db
def test_read_or_non_staff_requests_do_not_create_audit_events():
    user = get_user_model().objects.create_user(username="customer", email="customer@example.com")
    middleware = ObservabilityMiddleware(lambda request: JsonResponse({"ok": True}))
    for method, path in (("get", "/api/v1/staff/panel/"), ("post", "/api/v1/customer/support/")):
        request = getattr(RequestFactory(), method)(path)
        request.user = user
        middleware(request)

    assert not AuditLog.objects.exists()


@pytest.mark.django_db
def test_staff_failed_write_is_audited_without_trusting_invalid_ip():
    user = get_user_model().objects.create_user(
        username="failed-auditor", email="failed-auditor@example.com", is_staff=True
    )
    request = RequestFactory().post(
        "/api/v1/staff/panel/", HTTP_X_FORWARDED_FOR="not-an-ip", HTTP_X_REQUEST_ID="trace-failure"
    )
    request.user = user
    request.request_id = "trace-failure"
    request.resolver_match = SimpleNamespace(view_name="staff-panel-settings", route="", kwargs={})

    response = ObservabilityMiddleware(lambda request: JsonResponse({}, status=422))(request)
    audit = AuditLog.objects.get()

    assert response.status_code == 422
    assert audit.status_code == 422
    assert audit.payload == {"outcome": "failure"}
    assert audit.ip_address is None


@pytest.mark.django_db
def test_audit_storage_failure_does_not_replace_business_response(mocker):
    user = get_user_model().objects.create_user(
        username="resilient-auditor", email="resilient-auditor@example.com", is_staff=True
    )
    request = RequestFactory().post("/api/v1/staff/panel/")
    request.user = user
    request.resolver_match = SimpleNamespace(view_name="staff-panel-settings", route="", kwargs={})
    mocker.patch.object(AuditLog.objects, "create", side_effect=RuntimeError("database unavailable"))

    response = ObservabilityMiddleware(lambda request: JsonResponse({"saved": True}, status=201))(request)

    assert response.status_code == 201
    assert json.loads(response.content) == {"saved": True}


@pytest.mark.django_db
def test_authenticated_staff_api_write_is_audited_end_to_end():
    user = get_user_model().objects.create_user(
        username="api-auditor", email="api-auditor@example.com", is_staff=True
    )
    client = APIClient()
    client.force_authenticate(user)

    response = client.put(
        "/api/v1/staff/panel/",
        {"name": "Observed server", "max_level": 80},
        format="json",
        HTTP_X_REQUEST_ID="integration-trace",
    )

    audit = AuditLog.objects.get(request_id="integration-trace")
    assert response.status_code == 200
    assert audit.actor == user
    assert audit.action == "staff-panel-settings:put"
    assert audit.method == "PUT"
    assert audit.status_code == 200
