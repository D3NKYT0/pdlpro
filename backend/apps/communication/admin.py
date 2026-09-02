from django.contrib import admin

from apps.communication.infrastructure.models import Notification, PushSubscription
from common.admin import PDLModelAdmin


@admin.register(Notification)
class NotificationAdmin(PDLModelAdmin):
    """Configura a administração Django de ``Notification``.

    A listagem exibe ``title``, ``user``, ``kind``, ``is_read``, ``created_at``. Ajuste filtros,
    busca e campos nesta classe para mudar a experiência da equipe no admin; regras
    reutilizáveis ficam na aplicação.
    """

    list_display = ("title", "user", "kind", "is_read", "created_at")
    list_filter = ("kind", "is_read")
    search_fields = ("title", "user__username")


@admin.register(PushSubscription)
class PushSubscriptionAdmin(PDLModelAdmin):
    """Configura a administração Django de ``PushSubscription``.

    A listagem exibe ``user``, ``endpoint``, ``created_at``. Ajuste filtros, busca e campos
    nesta classe para mudar a experiência da equipe no admin; regras reutilizáveis ficam na
    aplicação.
    """

    list_display = ("user", "endpoint", "created_at")
    search_fields = ("user__username", "endpoint")
