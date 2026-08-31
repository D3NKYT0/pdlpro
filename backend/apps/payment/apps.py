from django.apps import AppConfig


class PaymentConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.payment"
    label = "payment"
    verbose_name = "Pagamento"

    def ready(self):
        from common.di.bootstrap import DependencyInjection

        from .infrastructure.provider import PaymentProvider

        DependencyInjection.add_provider(PaymentProvider())
