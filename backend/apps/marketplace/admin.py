from django.contrib import admin

from apps.marketplace.infrastructure.models import CharacterListing
from common.admin import PDLModelAdmin


@admin.register(CharacterListing)
class CharacterListingAdmin(PDLModelAdmin):
    """Configura a administração Django de ``CharacterListing``.

    A listagem exibe ``char_name``, ``seller``, ``price``, ``status``, ``created_at``. Ajuste
    filtros, busca e campos nesta classe para mudar a experiência da equipe no admin; regras
    reutilizáveis ficam na aplicação.
    """

    list_display = ("char_name", "seller", "price", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("char_name", "seller__username")
