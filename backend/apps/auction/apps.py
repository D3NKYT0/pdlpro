from django.apps import AppConfig


class AuctionConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.auction"
    label = "auction"
    verbose_name = "Leilão"

    def ready(self):
        from common.di.bootstrap import DependencyInjection

        from .infrastructure.provider import AuctionProvider

        DependencyInjection.add_provider(AuctionProvider())
