from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.accounts"
    label = "accounts"
    verbose_name = "Contas"

    def ready(self):
        from common.di.bootstrap import DependencyInjection

        from .infrastructure.provider import AccountsProvider

        DependencyInjection.add_provider(AccountsProvider())
