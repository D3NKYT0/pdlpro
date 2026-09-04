from dataclasses import asdict

from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.content.application.legal import GetLegalDocumentUseCase, ListLegalDocumentsUseCase
from apps.content.application.use_cases import (
    GetNewsInput,
    GetNewsUseCase,
    GetWikiPageInput,
    GetWikiPageUseCase,
    ListCalendarEventsUseCase,
    ListDownloadsUseCase,
    ListFaqUseCase,
    ListFaqInput,
    ListNewsUseCase,
    ListWikiPagesUseCase,
    SearchWikiInput,
    SearchWikiUseCase,
)
from common.views import InjectedAPIView


class NewsListView(InjectedAPIView):
    """Entrada HTTP para ``ListNewsUseCase``.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(tags=["Conteúdo"])
    def get(self, request):
        items = self.resolve(ListNewsUseCase).execute(None)
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

    @extend_schema(tags=["Conteúdo"])
    def get(self, request, slug: str):
        news = self.resolve(GetNewsUseCase).execute(GetNewsInput(slug=slug))
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

    @extend_schema(tags=["Conteúdo"])
    def get(self, request):
        language = "en" if request.query_params.get("lang") == "en" else "pt"
        return Response(self.resolve(ListFaqUseCase).execute(ListFaqInput(language=language)))


class DownloadListView(InjectedAPIView):
    """Entrada HTTP para ``ListDownloadsUseCase``.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(tags=["Conteúdo"])
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

    @extend_schema(tags=["Wiki"])
    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if query:
            items = self.resolve(SearchWikiUseCase).execute(SearchWikiInput(query=query))
        else:
            items = self.resolve(ListWikiPagesUseCase).execute(None)
        return Response([dump_wiki(item) for item in items])


class WikiDetailView(InjectedAPIView):
    """Entrada HTTP para ``GetWikiPageUseCase``.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(tags=["Wiki"])
    def get(self, request, slug: str):
        return Response(dump_wiki(self.resolve(GetWikiPageUseCase).execute(GetWikiPageInput(slug=slug))))


class CalendarEventListView(InjectedAPIView):
    """Entrada HTTP para ``ListCalendarEventsUseCase``.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(tags=["Calendário"])
    def get(self, request):
        return Response(self.resolve(ListCalendarEventsUseCase).execute(None))


class LegalListView(InjectedAPIView):
    """Entrada HTTP para ``ListLegalDocumentsUseCase``.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(tags=["Legal"])
    def get(self, request):
        return Response(self.resolve(ListLegalDocumentsUseCase).execute())


class LegalDetailView(InjectedAPIView):
    """Entrada HTTP para ``GetLegalDocumentUseCase``.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(tags=["Legal"])
    def get(self, request, slug: str):
        return Response(asdict(self.resolve(GetLegalDocumentUseCase).execute(slug)))
