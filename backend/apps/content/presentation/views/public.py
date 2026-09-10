from dataclasses import asdict

from django.utils.translation import gettext_lazy
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.content.application.legal import (
    GetLegalDocumentInput,
    GetLegalDocumentUseCase,
    ListLegalDocumentsInput,
    ListLegalDocumentsUseCase,
    ListLegalHistoryInput,
    ListLegalHistoryUseCase,
)
from apps.content.application.use_cases import (
    GetNewsInput,
    GetNewsUseCase,
    GetWikiPageInput,
    GetWikiPageUseCase,
    ListCalendarEventsUseCase,
    ListDownloadsUseCase,
    ListFaqInput,
    ListFaqUseCase,
    ListNewsInput,
    ListNewsUseCase,
    ListWikiInput,
    ListWikiPagesUseCase,
    SearchWikiInput,
    SearchWikiUseCase,
)
from common.i18n import resolve_language
from common.views import InjectedAPIView


class NewsListView(InjectedAPIView):
    """Entrada HTTP para ``ListNewsUseCase``.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        tags=["Conteúdo"],
        summary=gettext_lazy("Listar notícias"),
        description=gettext_lazy("Lista as notícias públicas publicadas no portal."),
    )
    def get(self, request):
        language = resolve_language(request.query_params.get("lang"))
        items = self.resolve(ListNewsUseCase).execute(ListNewsInput(language=language))
        payload = []
        for item in items:
            row = asdict(item)
            row["id"] = str(row["id"])
            payload.append(row)
        return Response(payload)


class NewsDetailView(InjectedAPIView):
    """Entrada HTTP para ``GetNewsUseCase``.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        tags=["Conteúdo"],
        summary=gettext_lazy("Detalhe da notícia"),
        description=gettext_lazy("Retorna o conteúdo completo da notícia identificada pelo slug."),
    )
    def get(self, request, slug: str):
        language = resolve_language(request.query_params.get("lang"))
        news = self.resolve(GetNewsUseCase).execute(GetNewsInput(slug=slug, language=language))
        payload = asdict(news)
        payload["id"] = str(payload["id"])
        return Response(payload)


class FaqListView(InjectedAPIView):
    """Entrada HTTP para ``ListFaqUseCase``.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        tags=["Conteúdo"],
        summary=gettext_lazy("Listar FAQ público"),
        description=gettext_lazy("Lista as perguntas frequentes públicas no idioma solicitado."),
    )
    def get(self, request):
        language = resolve_language(request.query_params.get("lang"))
        return Response(self.resolve(ListFaqUseCase).execute(ListFaqInput(language=language)))


class DownloadListView(InjectedAPIView):
    """Entrada HTTP para ``ListDownloadsUseCase``.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        tags=["Conteúdo"],
        summary=gettext_lazy("Listar downloads"),
        description=gettext_lazy("Lista os arquivos e links de download disponíveis publicamente."),
    )
    def get(self, request):
        return Response(self.resolve(ListDownloadsUseCase).execute(None))


def dump_wiki(item) -> dict:
    payload = asdict(item)
    payload["id"] = str(payload["id"])
    return payload


class WikiListView(InjectedAPIView):
    """Entrada HTTP para ``SearchWikiUseCase``, ``ListWikiPagesUseCase``.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        tags=["Wiki"],
        summary=gettext_lazy("Listar ou buscar wiki"),
        description=gettext_lazy("Lista as páginas da wiki ou busca por termo quando o parâmetro q é informado."),
    )
    def get(self, request):
        language = resolve_language(request.query_params.get("lang"))
        query = request.query_params.get("q", "").strip()
        if query:
            items = self.resolve(SearchWikiUseCase).execute(
                SearchWikiInput(query=query, language=language)
            )
        else:
            items = self.resolve(ListWikiPagesUseCase).execute(ListWikiInput(language=language))
        return Response([dump_wiki(item) for item in items])


class WikiDetailView(InjectedAPIView):
    """Entrada HTTP para ``GetWikiPageUseCase``.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        tags=["Wiki"],
        summary=gettext_lazy("Detalhe da página wiki"),
        description=gettext_lazy("Retorna o conteúdo da página da wiki identificada pelo slug."),
    )
    def get(self, request, slug: str):
        language = resolve_language(request.query_params.get("lang"))
        return Response(
            dump_wiki(
                self.resolve(GetWikiPageUseCase).execute(
                    GetWikiPageInput(slug=slug, language=language)
                )
            )
        )


class CalendarEventListView(InjectedAPIView):
    """Entrada HTTP para ``ListCalendarEventsUseCase``.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        tags=["Calendário"],
        summary=gettext_lazy("Listar eventos do calendário"),
        description=gettext_lazy("Lista os eventos públicos do calendário do servidor."),
    )
    def get(self, request):
        return Response(self.resolve(ListCalendarEventsUseCase).execute(None))


class LegalListView(InjectedAPIView):
    """Entrada HTTP para ``ListLegalDocumentsUseCase``.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        tags=["Legal"],
        summary=gettext_lazy("Listar documentos legais"),
        description=gettext_lazy("Lista os documentos legais públicos disponíveis no portal."),
    )
    def get(self, request):
        language = resolve_language(request.query_params.get("lang"))
        return Response(
            self.resolve(ListLegalDocumentsUseCase).execute(
                ListLegalDocumentsInput(language=language)
            )
        )


class LegalHistoryView(InjectedAPIView):
    """Entrada HTTP para ``ListLegalHistoryUseCase``.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        tags=["Legal"],
        summary=gettext_lazy("Histórico de versões legais"),
        description=gettext_lazy("Lista o histórico público de versões dos documentos legais."),
    )
    def get(self, request):
        language = resolve_language(request.query_params.get("lang"))
        return Response(
            self.resolve(ListLegalHistoryUseCase).execute(ListLegalHistoryInput(language=language))
        )


class LegalDetailView(InjectedAPIView):
    """Entrada HTTP para ``GetLegalDocumentUseCase``.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        tags=["Legal"],
        summary=gettext_lazy("Detalhe do documento legal"),
        description=gettext_lazy("Retorna o conteúdo do documento legal identificado pelo slug."),
    )
    def get(self, request, slug: str):
        language = resolve_language(request.query_params.get("lang"))
        return Response(
            asdict(
                self.resolve(GetLegalDocumentUseCase).execute(
                    GetLegalDocumentInput(slug=slug, language=language)
                )
            )
        )
