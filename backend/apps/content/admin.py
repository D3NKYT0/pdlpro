from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from apps.content.infrastructure.models import (
    CalendarEvent,
    DenkynhoHandbook,
    DownloadLink,
    Faq,
    News,
    WikiPage,
)
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
    search_fields = ("title", "title_en", "title_es", "excerpt", "body")
    fieldsets = (
        (_("Publicação"), {"fields": ("is_published", "published_at", "slug", "image", "author")}),
        (_("Português"), {"fields": ("title", "excerpt", "body")}),
        (_("English"), {"fields": ("title_en", "excerpt_en", "body_en")}),
        (_("Español"), {"fields": ("title_es", "excerpt_es", "body_es")}),
    )


@admin.register(Faq)
class FaqAdmin(PDLModelAdmin):
    """Configura a administração Django de ``Faq``.

    A listagem separa artigos por assunto, audiência e consulta exclusiva do Denkynho.
    A ordem e a publicação continuam controladas individualmente.
    """

    list_display = ("question", "category", "audience", "assistant_only", "order", "is_published")
    list_filter = ("category", "audience", "assistant_only", "is_published")
    search_fields = (
        "question", "short_answer", "answer", "keywords",
        "question_en", "short_answer_en", "answer_en", "keywords_en",
        "question_es", "short_answer_es", "answer_es", "keywords_es",
    )
    fieldsets = (
        (_("Publicação"), {
            "fields": ("is_published", "audience", "assistant_only", "category", "order"),
            "description": _(
                "Marque Somente assistente para um passo a passo do Denkynho. "
                "Não é necessária uma migration: o artigo entra na consulta no próximo salvamento."
            ),
        }),
        (_("Português"), {"fields": ("question", "short_answer", "answer", "keywords")}),
        (_("English"), {"fields": ("question_en", "short_answer_en", "answer_en", "keywords_en")}),
        (_("Español"), {"fields": ("question_es", "short_answer_es", "answer_es", "keywords_es")}),
    )


@admin.register(DenkynhoHandbook)
class DenkynhoHandbookAdmin(PDLModelAdmin):
    """Formulário editorial dos passo a passo internos do Denkynho.

    Novos artigos nascem com ``assistant_only`` e não entram no FAQ público. A equipe
    publica em português, inglês e espanhol por aqui, sem uma migration de conteúdo.
    """

    list_display = ("question", "category", "audience", "order", "is_published")
    list_filter = ("category", "audience", "is_published")
    search_fields = (
        "question", "short_answer", "answer", "keywords",
        "question_en", "short_answer_en", "answer_en", "keywords_en",
        "question_es", "short_answer_es", "answer_es", "keywords_es",
    )
    fieldsets = (
        (_("Destino"), {
            "fields": ("is_published", "audience", "category", "order"),
            "description": _(
                "Este artigo fica só na consulta do Denkynho. Jogadores recebem audiência Todos; "
                "a equipe e os superadministradores usam os níveis correspondentes."
            ),
        }),
        (_("Português"), {"fields": ("question", "short_answer", "answer", "keywords")}),
        (_("English"), {"fields": ("question_en", "short_answer_en", "answer_en", "keywords_en")}),
        (_("Español"), {"fields": ("question_es", "short_answer_es", "answer_es", "keywords_es")}),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).filter(assistant_only=True)

    def save_model(self, request, obj, form, change):
        obj.assistant_only = True
        super().save_model(request, obj, form, change)


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
    search_fields = ("title", "title_en", "title_es", "summary", "body")
    fieldsets = (
        (_("Publicação"), {"fields": ("is_published", "is_menu_item", "category", "icon", "order", "slug")}),
        (_("Português"), {"fields": ("title", "summary", "body")}),
        (_("English"), {"fields": ("title_en", "summary_en", "body_en")}),
        (_("Español"), {"fields": ("title_es", "summary_es", "body_es")}),
    )


@admin.register(CalendarEvent)
class CalendarEventAdmin(PDLModelAdmin):
    """Configura a administração Django de ``CalendarEvent``.

    A listagem exibe ``title``, ``starts_at``, ``ends_at``, ``is_published``. Ajuste filtros,
    busca e campos nesta classe para mudar a experiência da equipe no admin; regras
    reutilizáveis ficam na aplicação.
    """

    list_display = ("title", "starts_at", "ends_at", "is_published")
    list_filter = ("is_published",)
