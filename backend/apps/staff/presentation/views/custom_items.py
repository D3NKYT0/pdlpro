from io import BytesIO

from django.core.files.base import ContentFile
from drf_spectacular.utils import extend_schema
from PIL import Image, ImageOps
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response

from apps.server.application.custom_items import (
    GetCustomItemUseCase,
    ListCustomItemsInput,
    ListCustomItemsUseCase,
    UpsertCustomItemInput,
    UpsertCustomItemUseCase,
    catalog_choices,
)
from apps.server.infrastructure.custom_item_models import CustomCatalogItem
from apps.server.infrastructure.lineage.item_catalog import get_xml_catalog
from common.permissions import IsStaffMember
from common.views import InjectedAPIView


class CanViewCustomItems(BasePermission):
    """Permissão DRF usada pelas consultas administrativas de itens customizados.

    Declare em permission_classes nas views do catálogo customizado. Os critérios de usuário e
    permissão específica ficam em ``has_permission``.
    """

    def has_permission(self, request, view):
        return request.user.has_perm("server.view_customcatalogitem")


class CustomItemSerializer(serializers.ModelSerializer):
    """Representa e valida os metadados de um item customizado no catálogo.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização e a persistência pertencem ao fluxo chamador / caso de uso.

    Campos declarados: ``image``, ``icon_url``, ``conflicts_with_xml``.
    """

    image = serializers.ImageField(write_only=True)
    icon_url = serializers.SerializerMethodField()
    conflicts_with_xml = serializers.SerializerMethodField()

    class Meta:
        model = CustomCatalogItem
        fields = (
            "id",
            "item_id",
            "name",
            "image",
            "icon_url",
            "category",
            "grade",
            "tradeable",
            "metadata",
            "active",
            "conflicts_with_xml",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def get_icon_url(self, obj):
        return obj.image.url if obj.image else None

    def get_conflicts_with_xml(self, obj):
        return get_xml_catalog().get(obj.item_id) is not None

    def validate_image(self, value):
        if value.size > 2 * 1024 * 1024:
            raise serializers.ValidationError("A imagem deve ter no máximo 2 MB.")
        try:
            value.seek(0)
            with Image.open(value) as img:
                if img.format not in {"PNG", "JPEG", "WEBP"} or getattr(img, "is_animated", False):
                    raise serializers.ValidationError("Use PNG, JPEG ou WebP estático.")
                if max(img.size) > 1024:
                    raise serializers.ValidationError("Dimensões máximas: 1024 × 1024 pixels.")
                clean = ImageOps.exif_transpose(img).convert("RGBA")
                sanitized = Image.new("RGBA", clean.size)
                sanitized.paste(clean)
                output = BytesIO()
                sanitized.save(output, format="PNG")
            return ContentFile(output.getvalue(), name="icon.png")
        except (OSError, ValueError, Image.DecompressionBombError):
            raise serializers.ValidationError("Imagem inválida.") from None


class CustomItemQuery(serializers.Serializer):
    """Valida os filtros de pesquisa do catálogo administrativo de itens customizados.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``search``, ``page``.
    """

    search = serializers.CharField(default="", allow_blank=True, max_length=100)
    page = serializers.IntegerField(default=1, min_value=1, max_value=1000000)


class CustomItemsView(InjectedAPIView):
    """Pesquisa e cria metadados de itens customizados no catálogo administrativo.

    Implementa GET, POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated, IsStaffMember, CanViewCustomItems]. Resolve casos de uso do
    ServerProvider.
    """

    permission_classes = [IsAuthenticated, IsStaffMember, CanViewCustomItems]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def require(self, request, action):
        if not request.user.has_perm(f"server.{action}_customcatalogitem"):
            raise PermissionDenied("Você não tem permissão para esta ação.")

    @extend_schema(
        tags=["Staff - Itens customizados"],
        summary="Listar itens customizados",
        description="Pesquisa e pagina itens customizados do catálogo administrativo com filtros opcionais.",
        parameters=[CustomItemQuery],
        responses=CustomItemSerializer(many=True),
    )
    def get(self, request):
        options = CustomItemQuery(data=request.query_params)
        options.is_valid(raise_exception=True)
        page = self.resolve(ListCustomItemsUseCase).execute(
            ListCustomItemsInput(
                search=options.validated_data["search"],
                page=options.validated_data["page"],
            )
        )
        return Response(
            {
                "results": CustomItemSerializer(page.rows, many=True).data,
                "count": page.count,
                "page": page.page,
                "pages": page.pages,
                "permissions": {
                    action: request.user.has_perm(f"server.{action}_customcatalogitem")
                    for action in ("add", "change")
                },
                **catalog_choices(),
            }
        )

    @extend_schema(
        tags=["Staff - Itens customizados"],
        summary="Criar item customizado",
        description="Cadastra um novo item customizado no catálogo administrativo.",
        request=CustomItemSerializer,
        responses={201: CustomItemSerializer},
    )
    def post(self, request):
        self.require(request, "add")
        serializer = CustomItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        row = self.resolve(UpsertCustomItemUseCase).execute(
            UpsertCustomItemInput(validated_data=serializer.validated_data)
        )
        return Response(CustomItemSerializer(row).data, status=201)


class CustomItemDetailView(CustomItemsView):
    """Atualiza ou exclui um item customizado mediante as permissões exigidas para a ação.

    Implementa GET, POST, PATCH; registre ``as_view()`` nas URLs do módulo. Usa as permissões
    herdadas da base ou definidas nos padrões do DRF.
    """

    @extend_schema(
        tags=["Staff - Itens customizados"],
        summary="Detalhe do item customizado",
        description="Retorna os metadados de um item customizado identificado pelo UUID.",
        responses=CustomItemSerializer,
    )
    def get(self, request, item_uuid):
        row = self.resolve(GetCustomItemUseCase).execute(item_uuid)
        return Response(CustomItemSerializer(row).data)

    @extend_schema(
        tags=["Staff - Itens customizados"],
        summary="Método não permitido",
        description="Endpoint de detalhe não aceita POST; use PATCH para atualizar o item.",
        responses={405: None},
    )
    def post(self, request, item_uuid):
        return Response(status=405)

    @extend_schema(
        tags=["Staff - Itens customizados"],
        summary="Atualizar item customizado",
        description="Atualiza parcialmente os metadados de um item customizado existente.",
        request=CustomItemSerializer,
        responses=CustomItemSerializer,
    )
    def patch(self, request, item_uuid):
        self.require(request, "change")
        instance = self.resolve(GetCustomItemUseCase).execute(item_uuid)
        serializer = CustomItemSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        row = self.resolve(UpsertCustomItemUseCase).execute(
            UpsertCustomItemInput(validated_data=serializer.validated_data, item_id=item_uuid)
        )
        return Response(CustomItemSerializer(row).data)
