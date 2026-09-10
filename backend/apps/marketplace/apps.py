from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class MarketplaceConfig(AppConfig):
    """Configuração Django do módulo marketplace.

    O método ready registra as dependências do módulo no catálogo de DI. Referencie esta classe
    em INSTALLED_APPS para habilitar o módulo.
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.marketplace"
    label = "marketplace"
    verbose_name=_("Marketplace")

    def ready(self):
        from common.di.bootstrap import DependencyInjection

        from .infrastructure.provider import MarketplaceProvider

        DependencyInjection.add_provider(MarketplaceProvider())
