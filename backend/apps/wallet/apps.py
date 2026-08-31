from django.apps import AppConfig


class WalletConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.wallet"
    label = "wallet"
    verbose_name = "Carteira"

    def ready(self):
        from common.di.bootstrap import DependencyInjection

        from .infrastructure.provider import WalletProvider

        DependencyInjection.add_provider(WalletProvider())
