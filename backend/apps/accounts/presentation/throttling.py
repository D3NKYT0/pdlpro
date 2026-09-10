from rest_framework.settings import api_settings
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class ConfiguredAnonRateThrottle(AnonRateThrottle):
    """Lê a taxa do escopo na configuração ativa em vez de reutilizar o escopo ``anon``."""

    scope = ""

    def get_rate(self):
        return api_settings.DEFAULT_THROTTLE_RATES.get(self.scope)


class ConfiguredUserRateThrottle(UserRateThrottle):
    """Lê a taxa do escopo na configuração ativa em vez de reutilizar o escopo ``user``."""

    scope = ""

    def get_rate(self):
        return api_settings.DEFAULT_THROTTLE_RATES.get(self.scope)


class LoginRateThrottle(ConfiguredAnonRateThrottle):
    """Limita tentativas de login pelo endereço identificado pelo DRF."""

    scope = "login"


class RegisterRateThrottle(ConfiguredAnonRateThrottle):
    """Limita criações de conta pelo endereço identificado pelo DRF."""

    scope = "register"


class LgpdExportThrottle(ConfiguredUserRateThrottle):
    """Limita solicitações de exportação LGPD por usuário autenticado."""

    scope = "lgpd_export"


class LgpdDeleteThrottle(ConfiguredUserRateThrottle):
    """Limita pedidos de código e exclusão LGPD por usuário autenticado."""

    scope = "lgpd_delete"
