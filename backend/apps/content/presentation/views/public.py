from dataclasses import asdict

from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.content.application.use_cases import GetNewsInput, GetNewsUseCase, ListDownloadsUseCase, ListFaqUseCase, ListNewsUseCase
from common.views import InjectedAPIView


class NewsListView(InjectedAPIView):
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
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(tags=["Conteúdo"])
    def get(self, request, slug: str):
        news = self.resolve(GetNewsUseCase).execute(GetNewsInput(slug=slug))
        payload = asdict(news)
        payload["id"] = str(payload["id"])
        return Response(payload)


class FaqListView(InjectedAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(tags=["Conteúdo"])
    def get(self, request):
        return Response(self.resolve(ListFaqUseCase).execute(None))


class DownloadListView(InjectedAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(tags=["Conteúdo"])
    def get(self, request):
        return Response(self.resolve(ListDownloadsUseCase).execute(None))
