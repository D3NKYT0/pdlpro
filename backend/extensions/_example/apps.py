from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class ExampleExtensionConfig(AppConfig):
    """AppConfig de demonstração para extensões de cliente.

    Registra o provider no catálogo de DI em ``ready()``. Não faz parte do
    ``INSTALLED_APPS`` padrão; ative só via ``PDL_EXTENSION_APPS``.
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "extensions._example"
    label = "example_extension"
    verbose_name = _("Extensão de exemplo")

    def ready(self):
        from extensions.surface import DependencyInjection

        from .infrastructure.provider import ExampleExtensionProvider

        DependencyInjection.add_provider(ExampleExtensionProvider())
