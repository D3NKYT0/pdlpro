from django.apps import AppConfig


class StaffConfig(AppConfig):
    """Configuração Django do módulo staff.

    O método ready registra as dependências do módulo no catálogo de DI. Referencie esta classe
    em INSTALLED_APPS para habilitar o módulo.
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.staff"
    label = "staff"
    verbose_name = "Staff"

    def ready(self):
        from common.di.bootstrap import DependencyInjection

        from .infrastructure.provider import StaffProvider

        DependencyInjection.add_provider(StaffProvider())
