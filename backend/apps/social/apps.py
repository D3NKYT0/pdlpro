from django.apps import AppConfig


class SocialConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.social"
    label = "social"
    verbose_name = "Social"

    def ready(self):
        from common.di.bootstrap import DependencyInjection

        from .infrastructure.provider import SocialProvider

        DependencyInjection.add_provider(SocialProvider())
