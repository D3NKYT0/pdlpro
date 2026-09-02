from django.apps import AppConfig


class ContentConfig(AppConfig):
    """Configuração Django do módulo content.

    O método ready registra as dependências do módulo no catálogo de DI. Referencie esta classe
    em INSTALLED_APPS para habilitar o módulo.
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.content"
    label = "content"
    verbose_name = "Conteúdo"

    def ready(self):
        from common.di.bootstrap import DependencyInjection

        from .infrastructure.provider import ContentProvider

        DependencyInjection.add_provider(ContentProvider())
