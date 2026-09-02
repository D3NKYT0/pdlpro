from django.apps import AppConfig


class CommonConfig(AppConfig):
    """Configuração Django do módulo common.

    O método ready registra as dependências do módulo no catálogo de DI. Referencie esta classe
    em INSTALLED_APPS para habilitar o módulo.
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "common"
    verbose_name = "Common"

    def ready(self):
        from common.di.bootstrap import DependencyInjection
        from common.infrastructure.provider import CommonProvider

        DependencyInjection.add_provider(CommonProvider())
