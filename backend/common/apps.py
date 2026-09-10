from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class CommonConfig(AppConfig):
    """Configuração Django do módulo common.

    O método ready registra as dependências do módulo no catálogo de DI. Referencie esta classe
    em INSTALLED_APPS para habilitar o módulo.
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "common"
    verbose_name = _("Common")

    def ready(self):
        # Garante coleta de msgids de domínio no makemessages / carga do catálogo.
        import common.i18n_msgid_catalog

        # Registra OpenApiAuthenticationExtension do CookieJWT.
        import common.openapi_extensions  # noqa: F401
        from common.di.bootstrap import DependencyInjection
        from common.infrastructure.provider import CommonProvider

        DependencyInjection.add_provider(CommonProvider())
