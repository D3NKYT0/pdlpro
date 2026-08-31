from django.apps import AppConfig


class GamesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.games"
    label = "games"
    verbose_name = "Jogos"

    def ready(self):
        from common.di.bootstrap import DependencyInjection

        from .infrastructure.provider import GamesProvider

        DependencyInjection.add_provider(GamesProvider())
