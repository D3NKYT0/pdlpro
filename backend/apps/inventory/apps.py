from django.apps import AppConfig


class InventoryConfig(AppConfig):
    """Configuração Django do módulo inventory.

    O método ready registra as dependências do módulo no catálogo de DI. Referencie esta classe
    em INSTALLED_APPS para habilitar o módulo.
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.inventory"
    label = "inventory"
    verbose_name = "Inventário"

    def ready(self):
        from common.di.bootstrap import DependencyInjection

        from .infrastructure.provider import InventoryProvider

        DependencyInjection.add_provider(InventoryProvider())
