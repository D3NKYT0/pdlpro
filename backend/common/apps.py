from django.apps import AppConfig


class CommonConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "common"
    verbose_name = "Common"

    def ready(self):
        from common.di.bootstrap import DependencyInjection
        from common.infrastructure.provider import CommonProvider

        DependencyInjection.add_provider(CommonProvider())
