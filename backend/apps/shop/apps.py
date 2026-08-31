from django.apps import AppConfig


class ShopConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.shop"
    label = "shop"
    verbose_name = "Loja"

    def ready(self):
        from common.di.bootstrap import DependencyInjection

        from .infrastructure.provider import ShopProvider

        DependencyInjection.add_provider(ShopProvider())
