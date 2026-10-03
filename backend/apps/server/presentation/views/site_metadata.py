from django.http import HttpResponse
from django.template.loader import render_to_string
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.renderers import StaticHTMLRenderer

from apps.server.application.use_cases import GetServerInfoUseCase
from common.views import InjectedAPIView


class SiteMetadataView(InjectedAPIView):
    """Renderiza o head público para inclusão SSI no HTML inicial da SPA.

    Resolve a mesma identidade da API (ambiente, tema e admin), escapa conteúdo
    editorial no template e não armazena resposta nem dados de usuário em cache.
    Não consulta o servidor de jogo. GET/HEAD são públicos; não aceita escritas.
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    renderer_classes = [StaticHTMLRenderer]

    @extend_schema(exclude=True)
    def get(self, request):
        info = self.resolve(GetServerInfoUseCase).execute()
        image = request.build_absolute_uri(info.og_image or "/favicon/apple-touch-icon.png")
        html = render_to_string("server/site_metadata.html", {"info": info, "image": image})
        response = HttpResponse(html, content_type="text/html; charset=utf-8")
        response["Cache-Control"] = "no-store"
        return response
