from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class ThemesConfig(AppConfig):
    """Configura o catálogo de temas instaláveis do PDL 2.0.

    O método ready registra as dependências do módulo no catálogo de DI.
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.themes"
    label = "themes"
    verbose_name=_("Temas")

    def ready(self):
        from common.di.bootstrap import DependencyInjection

        from .infrastructure.provider import ThemesProvider

        DependencyInjection.add_provider(ThemesProvider())
