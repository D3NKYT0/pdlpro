from django.apps import AppConfig


class SupportConfig(AppConfig):
    """Configuração Django do módulo support.

    O método ready registra as dependências do módulo no catálogo de DI. Referencie esta classe
    em INSTALLED_APPS para habilitar o módulo.
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.support"
    verbose_name = "Atendimento"

    def ready(self):
        from common.di.bootstrap import DependencyInjection

        from .infrastructure.provider import SupportProvider

        DependencyInjection.add_provider(SupportProvider())
