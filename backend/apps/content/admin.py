from django.contrib import admin

from apps.content.infrastructure.models import CalendarEvent, DownloadLink, Faq, News, WikiPage
from common.admin import PDLModelAdmin


@admin.register(News)
class NewsAdmin(PDLModelAdmin):
    """Configura a administração Django de ``News``.

    A listagem exibe ``title``, ``slug``, ``is_published``, ``published_at``. Ajuste filtros,
    busca e campos nesta classe para mudar a experiência da equipe no admin; regras
    reutilizáveis ficam na aplicação.
    """

    list_display = ("title", "slug", "is_published", "published_at")
    prepopulated_fields = {"slug": ("title",)}
    list_filter = ("is_published",)


@admin.register(Faq)
class FaqAdmin(PDLModelAdmin):
    """Configura a administração Django de ``Faq``.

    A listagem exibe ``question``, ``order``, ``is_published``. Ajuste filtros, busca e campos
    nesta classe para mudar a experiência da equipe no admin; regras reutilizáveis ficam na
    aplicação.
    """

    list_display = ("question", "order", "is_published")


@admin.register(DownloadLink)
class DownloadLinkAdmin(PDLModelAdmin):
    """Configura a administração Django de ``DownloadLink``.

    A listagem exibe ``title``, ``category``, ``is_published``. Ajuste filtros, busca e campos
    nesta classe para mudar a experiência da equipe no admin; regras reutilizáveis ficam na
    aplicação.
    """

    list_display = ("title", "category", "is_published")


@admin.register(WikiPage)
class WikiPageAdmin(PDLModelAdmin):
    """Configura a administração Django de ``WikiPage``.

    A listagem exibe ``title``, ``slug``, ``category``, ``is_published``, ``is_menu_item``,
    ``order``. Ajuste filtros, busca e campos nesta classe para mudar a experiência da equipe no
    admin; regras reutilizáveis ficam na aplicação.
    """

    list_display = ("title", "slug", "category", "is_published", "is_menu_item", "order")
    prepopulated_fields = {"slug": ("title",)}
    list_filter = ("category", "is_published")


@admin.register(CalendarEvent)
class CalendarEventAdmin(PDLModelAdmin):
    """Configura a administração Django de ``CalendarEvent``.

    A listagem exibe ``title``, ``starts_at``, ``ends_at``, ``is_published``. Ajuste filtros,
    busca e campos nesta classe para mudar a experiência da equipe no admin; regras
    reutilizáveis ficam na aplicação.
    """

    list_display = ("title", "starts_at", "ends_at", "is_published")
    list_filter = ("is_published",)
