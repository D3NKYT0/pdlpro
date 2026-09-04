from django.apps import AppConfig
from django.contrib.admin.apps import AdminConfig


class MFAAdminConfig(AdminConfig):
    """Seleciona o admin com MFA e preserva o registro automático dos ModelAdmins."""

    default_site = "apps.accounts.admin_site.MFAAdminSite"


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
