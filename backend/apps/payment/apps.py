from django.apps import AppConfig


class PaymentConfig(AppConfig):
    """Configuração Django do módulo payment.

    O método ready registra as dependências do módulo no catálogo de DI. Referencie esta classe
    em INSTALLED_APPS para habilitar o módulo.
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.payment"
    label = "payment"
    verbose_name = "Pagamento"

    def ready(self):
        from common.di.bootstrap import DependencyInjection

        from .infrastructure.provider import PaymentProvider

        DependencyInjection.add_provider(PaymentProvider())
