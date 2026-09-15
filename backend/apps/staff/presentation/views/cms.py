from django.utils.translation import gettext_lazy
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.staff.application.cms import (
    DeleteStaffCalendarUseCase,
    DeleteStaffDownloadUseCase,
    DeleteStaffFaqUseCase,
    DeleteStaffWikiUseCase,
    ListStaffCalendarUseCase,
    ListStaffDownloadsUseCase,
    ListStaffFaqUseCase,
    ListStaffWikiUseCase,
    UpsertStaffCalendarUseCase,
    UpsertStaffDownloadUseCase,
    UpsertStaffFaqUseCase,
    UpsertStaffWikiUseCase,
)
from common.permissions import IsStaffMember
from common.views import InjectedAPIView


class StaffCalendarView(InjectedAPIView):
    """Entrada HTTP do CRUD administrativo do calendário público."""

    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Listar eventos do calendário"),
        description=gettext_lazy("Lista os eventos do calendário gerenciados pela equipe, inclusive rascunhos."),
    )
    def get(self, request):
        return Response(self.resolve(ListStaffCalendarUseCase).execute())

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Criar evento do calendário"),
        description=gettext_lazy("Cria um evento do calendário público com o payload administrativo informado."),
    )
    def post(self, request):
        return Response(self.resolve(UpsertStaffCalendarUseCase).execute(request.data or {}))

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Atualizar evento do calendário"),
        description=gettext_lazy("Atualiza um evento do calendário público com o payload administrativo informado."),
    )
    def put(self, request):
        return Response(self.resolve(UpsertStaffCalendarUseCase).execute(request.data or {}))

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Excluir evento do calendário"),
        description=gettext_lazy("Remove o evento do calendário identificado no payload."),
    )
    def delete(self, request):
        return Response(self.resolve(DeleteStaffCalendarUseCase).execute(request.data or {}))


class StaffFaqView(InjectedAPIView):
    """Entrada HTTP do CRUD administrativo do FAQ e do handbook do Denkynho."""

    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Listar FAQ"),
        description=gettext_lazy("Lista os artigos do FAQ gerenciados pela equipe, inclusive rascunhos e handbook."),
    )
    def get(self, request):
        return Response(self.resolve(ListStaffFaqUseCase).execute())

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Criar artigo do FAQ"),
        description=gettext_lazy("Cria um artigo do FAQ com o payload administrativo informado."),
    )
    def post(self, request):
        return Response(self.resolve(UpsertStaffFaqUseCase).execute(request.data or {}))

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Atualizar artigo do FAQ"),
        description=gettext_lazy("Atualiza um artigo do FAQ com o payload administrativo informado."),
    )
    def put(self, request):
        return Response(self.resolve(UpsertStaffFaqUseCase).execute(request.data or {}))

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Excluir artigo do FAQ"),
        description=gettext_lazy("Remove o artigo do FAQ identificado no payload."),
    )
    def delete(self, request):
        return Response(self.resolve(DeleteStaffFaqUseCase).execute(request.data or {}))


class StaffWikiView(InjectedAPIView):
    """Entrada HTTP do CRUD administrativo da wiki."""

    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Listar wiki"),
        description=gettext_lazy("Lista as páginas da wiki gerenciadas pela equipe, inclusive rascunhos."),
    )
    def get(self, request):
        return Response(self.resolve(ListStaffWikiUseCase).execute())

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Criar página da wiki"),
        description=gettext_lazy("Cria uma página da wiki com o payload administrativo informado."),
    )
    def post(self, request):
        return Response(self.resolve(UpsertStaffWikiUseCase).execute(request.data or {}))

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Atualizar página da wiki"),
        description=gettext_lazy("Atualiza uma página da wiki com o payload administrativo informado."),
    )
    def put(self, request):
        return Response(self.resolve(UpsertStaffWikiUseCase).execute(request.data or {}))

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Excluir página da wiki"),
        description=gettext_lazy("Remove a página da wiki identificada no payload."),
    )
    def delete(self, request):
        return Response(self.resolve(DeleteStaffWikiUseCase).execute(request.data or {}))


class StaffDownloadsView(InjectedAPIView):
    """Entrada HTTP do CRUD administrativo dos downloads."""

    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Listar downloads"),
        description=gettext_lazy("Lista os links de download gerenciados pela equipe, inclusive os não publicados."),
    )
    def get(self, request):
        return Response(self.resolve(ListStaffDownloadsUseCase).execute())

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Criar download"),
        description=gettext_lazy("Cria um link de download com o payload administrativo informado."),
    )
    def post(self, request):
        return Response(self.resolve(UpsertStaffDownloadUseCase).execute(request.data or {}))

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Atualizar download"),
        description=gettext_lazy("Atualiza um link de download com o payload administrativo informado."),
    )
    def put(self, request):
        return Response(self.resolve(UpsertStaffDownloadUseCase).execute(request.data or {}))

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Excluir download"),
        description=gettext_lazy("Remove o link de download identificado no payload."),
    )
    def delete(self, request):
        return Response(self.resolve(DeleteStaffDownloadUseCase).execute(request.data or {}))
