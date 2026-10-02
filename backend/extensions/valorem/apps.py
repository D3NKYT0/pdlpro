import logging

from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _

logger = logging.getLogger(__name__)


class ValoremConfig(AppConfig):
    """AppConfig da extensão Valorem.

    Registra o provedor de DI e recursos da extensão do cliente Valorem.
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "extensions.valorem"
    label = "valorem"
    verbose_name = _("Extensão Valorem")

    def ready(self):
        from extensions.surface import DependencyInjection

        from .infrastructure.provider import ValoremExtensionProvider

        DependencyInjection.add_provider(ValoremExtensionProvider())
