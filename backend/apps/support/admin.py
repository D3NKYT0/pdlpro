from django.contrib import admin

from apps.support.models import Ticket, TicketMessage
from common.admin import PDLModelAdmin


class TicketMessageInline(admin.TabularInline):
    """Configura a administração Django de ``TicketMessage``. Ajuste filtros, busca e campos nesta
    classe para mudar a experiência da equipe no admin; regras reutilizáveis ficam na aplicação.
    """

    model = TicketMessage
    extra = 0
    fields = ("author", "body", "is_staff_reply", "is_internal", "created_at")
    readonly_fields = ("created_at",)


@admin.register(Ticket)
class TicketAdmin(PDLModelAdmin):
    """Configura a administração Django de ``Ticket``.

    A listagem exibe ``protocol``, ``subject``, ``user``, ``category``, ``priority``,
    ``status``, ``assigned_to``, ``last_activity_at``. Ajuste filtros, busca e campos nesta
    classe para mudar a experiência da equipe no admin; regras reutilizáveis ficam na aplicação.
    """

    list_display = ("protocol", "subject", "user", "category", "priority", "status", "assigned_to", "last_activity_at")
    list_filter = ("status", "priority", "category")
    search_fields = ("protocol", "subject", "user__username", "user__email")
    readonly_fields = ("protocol", "first_response_at", "resolved_at", "closed_at")
    inlines = (TicketMessageInline,)


@admin.register(TicketMessage)
class TicketMessageAdmin(PDLModelAdmin):
    """Configura a administração Django de ``TicketMessage``.

    A listagem exibe ``ticket``, ``author``, ``is_staff_reply``, ``is_internal``,
    ``created_at``. Ajuste filtros, busca e campos nesta classe para mudar a experiência da
    equipe no admin; regras reutilizáveis ficam na aplicação.
    """

    list_display = ("ticket", "author", "is_staff_reply", "is_internal", "created_at")
    list_filter = ("is_staff_reply", "is_internal")
    search_fields = ("ticket__protocol", "body", "author__username")

