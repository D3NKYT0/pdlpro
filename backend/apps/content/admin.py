from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from apps.content.infrastructure.models import (
    Banner,
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
    search_fields = ("title", "title_en", "title_es", "description")
    fieldsets = (
        (_("Publicação"), {"fields": ("is_published", "starts_at", "ends_at", "color")}),
        (_("Português"), {"fields": ("title", "description")}),
        (_("English"), {"fields": ("title_en", "description_en")}),
        (_("Español"), {"fields": ("title_es", "description_es")}),
    )


@admin.register(Banner)
class BannerAdmin(PDLModelAdmin):
    """Configura a administração Django de ``Banner`` com preview e controle de visibilidade."""

    list_display = (
        "title",
        "display_type",
        "target_location",
        "dismiss_policy",
        "is_active",
        "order",
        "image_preview",
        "created_at",
    )
    list_filter = ("is_active", "display_type", "target_location", "dismiss_policy")
    search_fields = ("title", "title_en", "title_es", "badge", "description")
    list_editable = ("is_active", "order")
    readonly_fields = ("image_preview", "created_at", "updated_at")
    fieldsets = (
        (
            _("Configurações Gerais"),
            {
                "fields": (
                    "is_active",
                    "order",
                    "display_type",
                    "target_location",
                    "start_date",
                    "end_date",
                )
            },
        ),
        (
            _("Imagem e Mídia"),
            {
                "fields": (
                    "image",
                    "image_url",
                    "image_preview",
                    "width_px",
                )
            },
        ),
        (
            _("Frequência e Fechamento"),
            {
                "fields": (
                    "dismiss_policy",
                    "dismiss_days",
                    "show_close_button",
                    "auto_close",
                    "auto_close_delay",
                )
            },
        ),
        (
            _("Links e Ações (CTA)"),
            {
                "fields": (
                    "link",
                    "link_text",
                    "link_text_en",
                    "link_text_es",
                    "secondary_link",
                    "secondary_link_text",
                    "secondary_link_text_en",
                    "secondary_link_text_es",
                )
            },
        ),
        (_("Português"), {"fields": ("title", "badge", "description")}),
        (_("English"), {"fields": ("title_en", "badge_en", "description_en")}),
        (_("Español"), {"fields": ("title_es", "badge_es", "description_es")}),
    )

    def image_preview(self, obj):
        url = obj.get_image_url()
        if url:
            from django.utils.html import format_html
            return format_html(
                '<img src="{}" style="max-width: 140px; max-height: 80px; object-fit: contain; border-radius: 4px; border: 1px solid #444;" />',
                url,
            )
        return _("(Sem imagem)")

    image_preview.short_description = _("Preview")

    actions = ["activate_banners", "deactivate_banners"]

    def activate_banners(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, _("{} banners foram ativados.").format(updated))

    activate_banners.short_description = _("Ativar banners selecionados")

    def deactivate_banners(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, _("{} banners foram desativados.").format(updated))

    deactivate_banners.short_description = _("Desativar banners selecionados")

