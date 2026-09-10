from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class CommunicationConfig(AppConfig):
    """Configuração Django do módulo communication.

    O método ready registra as dependências do módulo no catálogo de DI. Referencie esta classe
    em INSTALLED_APPS para habilitar o módulo.
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.communication"
    label = "communication"
    verbose_name=_("Comunicação")

    def ready(self):
        from common.di.bootstrap import DependencyInjection

        from .infrastructure.provider import CommunicationProvider

        DependencyInjection.add_provider(CommunicationProvider())
