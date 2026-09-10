from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class ShopConfig(AppConfig):
    """Configuração Django do módulo shop.

    O método ready registra as dependências do módulo no catálogo de DI. Referencie esta classe
    em INSTALLED_APPS para habilitar o módulo.
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.shop"
    label = "shop"
    verbose_name=_("Loja")

    def ready(self):
        from common.di.bootstrap import DependencyInjection

        from .infrastructure.provider import ShopProvider

        DependencyInjection.add_provider(ShopProvider())
