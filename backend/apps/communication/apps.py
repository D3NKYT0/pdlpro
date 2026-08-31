from django.apps import AppConfig


class CommunicationConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.communication"
    label = "communication"
    verbose_name = "Comunicação"

    def ready(self):
        from common.di.bootstrap import DependencyInjection

        from .infrastructure.provider import CommunicationProvider

        DependencyInjection.add_provider(CommunicationProvider())
