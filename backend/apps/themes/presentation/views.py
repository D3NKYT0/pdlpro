from django.utils.cache import patch_cache_control
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.themes.application.theme_packages import (
    activate_theme,
    delete_theme,
    get_active_theme,
    install_theme,
    list_themes,
)
from common.permissions import IsSuperAdmin


class ThemeUploadSerializer(serializers.Serializer):
    """Contrato multipart usado para instalar um pacote ``.zip`` de tema."""

    package = serializers.FileField()

    def validate_package(self, value):
        if not value.name.lower().endswith(".zip"):
            raise serializers.ValidationError("Envie um arquivo .zip.")
        return value


class ActiveThemeView(APIView):
    """Expõe apenas os caminhos e metadados necessários para montar o tema ativo."""

    permission_classes = [AllowAny]

    @extend_schema(tags=["Temas"])
    def get(self, request):
        response = Response(get_active_theme())
        patch_cache_control(response, public=True, max_age=0, must_revalidate=True)
        return response


class StaffThemeListInstallView(APIView):
    """Lista e instala temas; alteração visual global é exclusiva de superadministradores."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @extend_schema(tags=["Staff"])
    def get(self, request):
        return Response(list_themes())

    @extend_schema(tags=["Staff"], request=ThemeUploadSerializer)
    def post(self, request):
        serializer = ThemeUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        package = serializer.validated_data["package"]
        installed = install_theme(package, size=package.size, user=request.user)
        return Response(installed, status=status.HTTP_201_CREATED)


class StaffThemeActivateView(APIView):
    """Ativa uma versão instalada ou restaura explicitamente o tema default."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    @extend_schema(tags=["Staff"])
    def post(self, request, package_id=None):
        return Response(activate_theme(str(package_id) if package_id else None))


class StaffThemeDetailView(APIView):
    """Remove um pacote inativo; o tema default não possui endpoint de exclusão."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    @extend_schema(tags=["Staff"])
    def delete(self, request, package_id):
        delete_theme(str(package_id))
        return Response(status=status.HTTP_204_NO_CONTENT)
