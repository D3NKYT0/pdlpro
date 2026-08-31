from django.apps import AppConfig


class InventoryConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.inventory"
    label = "inventory"
    verbose_name = "Inventário"

    def ready(self):
        from common.di.bootstrap import DependencyInjection

        from .infrastructure.provider import InventoryProvider

        DependencyInjection.add_provider(InventoryProvider())
