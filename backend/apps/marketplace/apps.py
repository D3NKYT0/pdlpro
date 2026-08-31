from django.apps import AppConfig


class MarketplaceConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.marketplace"
    label = "marketplace"
    verbose_name = "Marketplace"

    def ready(self):
        from common.di.bootstrap import DependencyInjection

        from .infrastructure.provider import MarketplaceProvider

        DependencyInjection.add_provider(MarketplaceProvider())
