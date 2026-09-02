from django.apps import AppConfig


class ServerConfig(AppConfig):
    """Configuração Django do módulo server.

    O método ready registra as dependências do módulo no catálogo de DI. Referencie esta classe
    em INSTALLED_APPS para habilitar o módulo.
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.server"
    label = "server"
    verbose_name = "Servidor Lineage"

    def ready(self):
        from common.di.bootstrap import DependencyInjection

        from .infrastructure.provider import ServerProvider

        DependencyInjection.add_provider(ServerProvider())
