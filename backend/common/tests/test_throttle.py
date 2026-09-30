"""Testes de rate limiting e observabilidade de throttle."""

from unittest.mock import MagicMock, patch

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework.views import APIView

from common.middleware import ObservabilityMiddleware
from common.throttle import (
    AnonBurstThrottle,
    AnonSustainedThrottle,
    StaffThrottle,
    UserBurstThrottle,
    UserSustainedThrottle,
    WebhookRateThrottle,
)

User = get_user_model()

pytestmark = pytest.mark.django_db


class DummyAnonBurstView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonBurstThrottle]

    def get(self, request):
        return Response({"status": "ok"})


class DummyUserBurstView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [UserBurstThrottle]

    def get(self, request):
        return Response({"status": "ok"})


class DummyStaffView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [StaffThrottle]

    def get(self, request):
        return Response({"status": "ok"})


class DummyAnonSustainedView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonSustainedThrottle]

    def get(self, request):
        return Response({"status": "ok"})


class DummyUserSustainedView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [UserSustainedThrottle]

    def get(self, request):
        return Response({"status": "ok"})


class DummyWebhookView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [WebhookRateThrottle]

    def post(self, request):
        return Response({"received": True})


@pytest.fixture(autouse=True)
def clear_throttle_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture()
def regular_user():
    return User.objects.create_user(
        username="throttle-player",
        email="player@example.com",
        password="pass",
    )


@pytest.fixture()
def staff_user():
    return User.objects.create_user(
        username="throttle-gm",
        email="gm@example.com",
        password="pass",
        is_staff=True,
        role=User.Role.STAFF,
    )


def test_anon_burst_throttle_limits_requests():
    """AnonBurstThrottle bloqueia excesso de requisições."""
    factory = APIRequestFactory()
    view = DummyAnonBurstView.as_view()

    with patch.object(AnonBurstThrottle, "get_rate", return_value="2/min"):
        # Primeiras duas passam
        req1 = factory.get("/api/v1/dummy/")
        res1 = view(req1)
        assert res1.status_code == status.HTTP_200_OK

        req2 = factory.get("/api/v1/dummy/")
        res2 = view(req2)
        assert res2.status_code == status.HTTP_200_OK

        # Terceira é throttled (429)
        req3 = factory.get("/api/v1/dummy/")
        res3 = view(req3)
        assert res3.status_code == status.HTTP_429_TOO_MANY_REQUESTS


def test_user_burst_throttle_limits_regular_user(regular_user):
    """UserBurstThrottle bloqueia excesso de requisições de usuário comum."""
    factory = APIRequestFactory()
    view = DummyUserBurstView.as_view()

    with patch.object(UserBurstThrottle, "get_rate", return_value="2/min"):
        req1 = factory.get("/api/v1/dummy/")
        force_authenticate(req1, user=regular_user)
        res1 = view(req1)
        assert res1.status_code == status.HTTP_200_OK

        req2 = factory.get("/api/v1/dummy/")
        force_authenticate(req2, user=regular_user)
        res2 = view(req2)
        assert res2.status_code == status.HTTP_200_OK

        req3 = factory.get("/api/v1/dummy/")
        force_authenticate(req3, user=regular_user)
        res3 = view(req3)
        assert res3.status_code == status.HTTP_429_TOO_MANY_REQUESTS


def test_user_burst_throttle_exempts_staff(staff_user):
    """UserBurstThrottle isenta membros da equipe staff."""
    factory = APIRequestFactory()
    view = DummyUserBurstView.as_view()

    with patch.object(UserBurstThrottle, "get_rate", return_value="1/min"):
        for _ in range(5):
            req = factory.get("/api/v1/dummy/")
            force_authenticate(req, user=staff_user)
            res = view(req)
            assert res.status_code == status.HTTP_200_OK


def test_staff_throttle_applies_to_staff(staff_user):
    """StaffThrottle impõe limite a membros staff quando configurado."""
    factory = APIRequestFactory()
    view = DummyStaffView.as_view()

    with patch.object(StaffThrottle, "get_rate", return_value="2/min"):
        req1 = factory.get("/api/v1/dummy/")
        force_authenticate(req1, user=staff_user)
        assert view(req1).status_code == status.HTTP_200_OK

        req2 = factory.get("/api/v1/dummy/")
        force_authenticate(req2, user=staff_user)
        assert view(req2).status_code == status.HTTP_200_OK

        req3 = factory.get("/api/v1/dummy/")
        force_authenticate(req3, user=staff_user)
        assert view(req3).status_code == status.HTTP_429_TOO_MANY_REQUESTS


def test_webhook_rate_throttle_limits_requests():
    """WebhookRateThrottle bloqueia excesso de requisições de webhook."""
    factory = APIRequestFactory()
    view = DummyWebhookView.as_view()

    with patch.object(WebhookRateThrottle, "get_rate", return_value="2/min"):
        req1 = factory.post("/api/v1/dummy/webhook/")
        assert view(req1).status_code == status.HTTP_200_OK

        req2 = factory.post("/api/v1/dummy/webhook/")
        assert view(req2).status_code == status.HTTP_200_OK

        req3 = factory.post("/api/v1/dummy/webhook/")
        assert view(req3).status_code == status.HTTP_429_TOO_MANY_REQUESTS


def test_anon_sustained_throttle_limits_requests():
    """AnonSustainedThrottle bloqueia após exceder o limite sustentado."""
    factory = APIRequestFactory()
    view = DummyAnonSustainedView.as_view()

    with patch.object(AnonSustainedThrottle, "get_rate", return_value="2/min"):
        assert view(factory.get("/api/v1/dummy/")).status_code == status.HTTP_200_OK
        assert view(factory.get("/api/v1/dummy/")).status_code == status.HTTP_200_OK
        assert view(factory.get("/api/v1/dummy/")).status_code == status.HTTP_429_TOO_MANY_REQUESTS


def test_user_sustained_throttle_limits_and_exempts_staff(regular_user, staff_user):
    """UserSustainedThrottle limita usuários comuns e isenta equipe staff."""
    factory = APIRequestFactory()
    view = DummyUserSustainedView.as_view()

    with patch.object(UserSustainedThrottle, "get_rate", return_value="2/min"):
        r1 = factory.get("/api/v1/dummy/")
        force_authenticate(r1, user=regular_user)
        assert view(r1).status_code == status.HTTP_200_OK

        r2 = factory.get("/api/v1/dummy/")
        force_authenticate(r2, user=regular_user)
        assert view(r2).status_code == status.HTTP_200_OK

        r3 = factory.get("/api/v1/dummy/")
        force_authenticate(r3, user=regular_user)
        assert view(r3).status_code == status.HTTP_429_TOO_MANY_REQUESTS

        # Staff é isento
        for _ in range(5):
            rs = factory.get("/api/v1/dummy/")
            force_authenticate(rs, user=staff_user)
            assert view(rs).status_code == status.HTTP_200_OK


def test_observability_middleware_logs_throttle_event():
    """ObservabilityMiddleware emite log estruturado quando ocorre 429."""
    factory = APIRequestFactory()
    request = factory.get("/api/v1/throttled/")
    response = Response({"detail": "Throttled"}, status=status.HTTP_429_TOO_MANY_REQUESTS)

    get_response = MagicMock(return_value=response)
    middleware = ObservabilityMiddleware(get_response)

    with patch.object(middleware, "_log_throttle") as mock_log:
        res = middleware(request)
        assert res.status_code == 429
        mock_log.assert_called_once()
