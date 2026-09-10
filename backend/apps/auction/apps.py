from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class AuctionConfig(AppConfig):
    """Configuração Django do módulo auction.

    O método ready registra as dependências do módulo no catálogo de DI. Referencie esta classe
    em INSTALLED_APPS para habilitar o módulo.
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.auction"
    label = "auction"
    verbose_name=_("Leilão")

    def ready(self):
        from common.di.bootstrap import DependencyInjection

        from .infrastructure.provider import AuctionProvider

        DependencyInjection.add_provider(AuctionProvider())
