from django.apps import AppConfig


class StaffConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.staff"
    label = "staff"
    verbose_name = "Staff"

    def ready(self):
        from common.di.bootstrap import DependencyInjection

        from .infrastructure.provider import StaffProvider

        DependencyInjection.add_provider(StaffProvider())
