from django.apps import AppConfig


class SupportConfig(AppConfig):
    """Configuração Django do módulo support.

    Centraliza nome, rótulo e configuração de inicialização do módulo. Referencie esta classe em
    INSTALLED_APPS para habilitar o módulo.
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.support"
    verbose_name = "Atendimento"

