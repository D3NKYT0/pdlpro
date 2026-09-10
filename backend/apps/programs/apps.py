from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class ProgramsConfig(AppConfig):
    """Configuração Django do módulo programs.

    O método ready registra as dependências do módulo no catálogo de DI. Referencie esta classe
    em INSTALLED_APPS para habilitar o módulo. Models permanecem em ``models.py`` para preservar
    as migrações existentes.
    """

    name = "apps.programs"
    verbose_name=_("Programas e recursos")

    def ready(self):
        from common.di.bootstrap import DependencyInjection

        from .infrastructure.provider import ProgramsProvider

        DependencyInjection.add_provider(ProgramsProvider())
