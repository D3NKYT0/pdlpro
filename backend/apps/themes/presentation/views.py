from django.utils.cache import patch_cache_control
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.themes.application.use_cases import (
    ActivateThemeInput,
    ActivateThemeUseCase,
    DeleteThemeInput,
    DeleteThemeUseCase,
    GetActiveThemeUseCase,
    InstallThemeInput,
    InstallThemeUseCase,
    ListThemesUseCase,
)
from common.permissions import IsSuperAdmin
from common.views import InjectedAPIView


class ThemeUploadSerializer(serializers.Serializer):
    """Contrato multipart usado para instalar um pacote ``.zip`` de tema."""

    package = serializers.FileField()

    def validate_package(self, value):
        if not value.name.lower().endswith(".zip"):
            raise serializers.ValidationError("Envie um arquivo .zip.")
        return value


class ActiveThemeView(InjectedAPIView):
    """Expõe apenas os caminhos e metadados necessários para montar o tema ativo."""

    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Temas"],
        summary="Tema ativo",
        description="Expõe apenas os caminhos e metadados necessários para montar o tema ativo.",
    )
    def get(self, request):
        response = Response(self.resolve(GetActiveThemeUseCase).execute(None))
        patch_cache_control(response, public=True, max_age=0, must_revalidate=True)
        return response


class StaffThemeListInstallView(InjectedAPIView):
    """Lista e instala temas; alteração visual global é exclusiva de superadministradores."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @extend_schema(
        tags=["Staff"],
        summary="Listar temas",
        description="Lista os pacotes de tema instalados; alteração visual global é exclusiva de superadministradores.",
    )
    def get(self, request):
        return Response(self.resolve(ListThemesUseCase).execute(None))

    @extend_schema(
        tags=["Staff"],
        summary="Instalar tema",
        description="Instala um pacote .zip de tema; alteração visual global é exclusiva de superadministradores.",
        request=ThemeUploadSerializer,
    )
    def post(self, request):
        serializer = ThemeUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        package = serializer.validated_data["package"]
        installed = self.resolve(InstallThemeUseCase).execute(
            InstallThemeInput(upload=package, size=package.size, user=request.user)
        )
        return Response(installed, status=status.HTTP_201_CREATED)


class StaffThemeActivateView(InjectedAPIView):
    """Ativa uma versão instalada ou restaura explicitamente o tema default."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    @extend_schema(
        tags=["Staff"],
        summary="Ativar tema",
        description="Ativa uma versão instalada ou restaura explicitamente o tema default.",
    )
    def post(self, request, package_id=None):
        return Response(
            self.resolve(ActivateThemeUseCase).execute(
                ActivateThemeInput(package_id=str(package_id) if package_id else None)
            )
        )


class StaffThemeDetailView(InjectedAPIView):
    """Remove um pacote inativo; o tema default não possui endpoint de exclusão."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    @extend_schema(
        tags=["Staff"],
        summary="Excluir tema",
        description="Remove um pacote inativo; o tema default não possui endpoint de exclusão.",
    )
    def delete(self, request, package_id):
        self.resolve(DeleteThemeUseCase).execute(DeleteThemeInput(package_id=str(package_id)))
        return Response(status=status.HTTP_204_NO_CONTENT)
