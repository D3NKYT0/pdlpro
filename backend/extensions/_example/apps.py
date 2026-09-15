import logging

from django.apps import AppConfig
from django.core.exceptions import AppRegistryNotReady
from django.db.utils import OperationalError, ProgrammingError
from django.utils.translation import gettext_lazy as _

logger = logging.getLogger(__name__)


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
        from extensions.resources import ExtensionResource, sync_extension_resources
        from extensions.surface import DependencyInjection, declare_extension_resource

        from .infrastructure.provider import ExampleExtensionProvider

        declare_extension_resource(
            ExtensionResource(
                code="ext.example.ping",
                name=_("Ping da extensão"),
                category=_("Extensões"),
                description=_("Página de fumaça do overlay de exemplo."),
            )
        )
        try:
            sync_extension_resources()
        except (OperationalError, ProgrammingError, AppRegistryNotReady):
            logger.debug(
                "Recursos da extensão ainda não podem ser sincronizados (migrações pendentes)."
            )
        DependencyInjection.add_provider(ExampleExtensionProvider())
