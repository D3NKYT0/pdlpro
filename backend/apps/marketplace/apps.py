from django.apps import AppConfig


class MarketplaceConfig(AppConfig):
    """Configuração Django do módulo marketplace.

    O método ready registra as dependências do módulo no catálogo de DI. Referencie esta classe
    em INSTALLED_APPS para habilitar o módulo.
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.marketplace"
    label = "marketplace"
    verbose_name = "Marketplace"

    def ready(self):
        from common.di.bootstrap import DependencyInjection

        from .infrastructure.provider import MarketplaceProvider

        DependencyInjection.add_provider(MarketplaceProvider())
