from django.apps import AppConfig


class ClansConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.clans"
    label = "clans"
    verbose_name = "Clans"

    def ready(self):
        from common.di.bootstrap import DependencyInjection

        from .infrastructure.provider import ClansProvider

        DependencyInjection.add_provider(ClansProvider())
