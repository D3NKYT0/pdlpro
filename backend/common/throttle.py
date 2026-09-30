"""Classes de rate limiting e throttle para o PDL PRO."""

from __future__ import annotations

from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class AnonBurstThrottle(AnonRateThrottle):
    """Limita picos de requisições de clientes anônimos."""

    scope = "anon_burst"


class AnonSustainedThrottle(AnonRateThrottle):
    """Limita volume sustentado de requisições de clientes anônimos."""

    scope = "anon_sustained"


class UserBurstThrottle(UserRateThrottle):
    """Limita picos de requisições de usuários autenticados.

    Usuários staff são isentos deste throttle para preservar a operação do painel.
    """

    scope = "user_burst"

    def allow_request(self, request, view):
        if getattr(request.user, "is_authenticated", False) and getattr(request.user, "is_staff", False):
            return True
        return super().allow_request(request, view)


class UserSustainedThrottle(UserRateThrottle):
    """Limita volume sustentado de requisições de usuários autenticados.

    Usuários staff são isentos deste throttle.
    """

    scope = "user_sustained"

    def allow_request(self, request, view):
        if getattr(request.user, "is_authenticated", False) and getattr(request.user, "is_staff", False):
            return True
        return super().allow_request(request, view)


class StaffThrottle(UserRateThrottle):
    """Throttle dedicado com limite mais alto para a equipe staff."""

    scope = "staff"

    def allow_request(self, request, view):
        if not (getattr(request.user, "is_authenticated", False) and getattr(request.user, "is_staff", False)):
            return True
        return super().allow_request(request, view)


class WebhookRateThrottle(AnonRateThrottle):
    """Limita frequência de chamadas a webhooks de pagamento."""

    scope = "webhook"
