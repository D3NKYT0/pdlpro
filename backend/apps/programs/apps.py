from django.apps import AppConfig


class ProgramsConfig(AppConfig):
    """Configuração Django do módulo programs.

    Centraliza nome, rótulo e configuração de inicialização do módulo. Referencie esta classe em
    INSTALLED_APPS para habilitar o módulo.
    """

    name = "apps.programs"
    verbose_name = "Programas e recursos"
