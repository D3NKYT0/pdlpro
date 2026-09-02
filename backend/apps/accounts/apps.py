from django.apps import AppConfig


class AccountsConfig(AppConfig):
    """Configuração Django do módulo accounts.

    O método ready registra as dependências do módulo no catálogo de DI. Referencie esta classe
    em INSTALLED_APPS para habilitar o módulo.
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.accounts"
    label = "accounts"
    verbose_name = "Contas"

    def ready(self):
        from common.di.bootstrap import DependencyInjection

        from .infrastructure.provider import AccountsProvider

        DependencyInjection.add_provider(AccountsProvider())
