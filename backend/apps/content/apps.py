from django.apps import AppConfig


class ContentConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.content"
    label = "content"
    verbose_name = "Conteúdo"

    def ready(self):
        from common.di.bootstrap import DependencyInjection

        from .infrastructure.provider import ContentProvider

        DependencyInjection.add_provider(ContentProvider())
