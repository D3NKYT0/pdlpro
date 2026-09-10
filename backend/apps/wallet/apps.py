from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class WalletConfig(AppConfig):
    """Configuração Django do módulo wallet.

    O método ready registra as dependências do módulo no catálogo de DI. Referencie esta classe
    em INSTALLED_APPS para habilitar o módulo.
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.wallet"
    label = "wallet"
    verbose_name=_("Carteira")

    def ready(self):
        from common.di.bootstrap import DependencyInjection

        from .infrastructure.provider import WalletProvider

        DependencyInjection.add_provider(WalletProvider())
