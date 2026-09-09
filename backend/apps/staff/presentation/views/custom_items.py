from io import BytesIO
import json

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
from apps.server.domain.item_catalog import ITEM_CATEGORIES, ITEM_GRADES
from common.permissions import IsStaffMember
from common.views import InjectedAPIView


class CanViewCustomItems(BasePermission):
    """Permissão DRF usada pelas consultas administrativas de itens customizados."""

    def has_permission(self, request, view):
        return request.user.has_perm("server.view_customcatalogitem")


class CustomItemSerializer(serializers.Serializer):
    """Representa e valida os metadados de um item customizado no catálogo (dict)."""

    id = serializers.UUIDField(read_only=True)
    item_id = serializers.IntegerField(min_value=1, max_value=2147483647)
    name = serializers.CharField(max_length=255, allow_blank=False)
    image = serializers.ImageField(write_only=True, required=False)
    icon_url = serializers.CharField(read_only=True, allow_null=True)
    category = serializers.ChoiceField(
        choices=[key for key, _ in ITEM_CATEGORIES], default="COMUM"
    )
    grade = serializers.ChoiceField(choices=[key for key, _ in ITEM_GRADES], default="NG")
    tradeable = serializers.BooleanField(default=True)
    metadata = serializers.JSONField(required=False, default=dict)
    active = serializers.BooleanField(default=True)
    conflicts_with_xml = serializers.BooleanField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    def validate_metadata(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Os metadados devem ser um objeto JSON.")
        try:
            size = len(json.dumps(value, ensure_ascii=False, allow_nan=False).encode("utf-8"))
        except (TypeError, ValueError, RecursionError) as exc:
            raise serializers.ValidationError("Metadados JSON inválidos.") from exc
        if size > 16384:
            raise serializers.ValidationError("Metadados limitados a 16 KB.")
        return value

    def validate_image(self, value):
        if value is None:
            return value
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
    """Valida os filtros de pesquisa do catálogo administrativo de itens customizados."""

    search = serializers.CharField(default="", allow_blank=True, max_length=100)
    page = serializers.IntegerField(default=1, min_value=1, max_value=1000000)


class CustomItemsView(InjectedAPIView):
    """Pesquisa e cria metadados de itens customizados no catálogo administrativo."""

    permission_classes = [IsAuthenticated, IsStaffMember, CanViewCustomItems]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def require(self, request, action):
        if not request.user.has_perm(f"server.{action}_customcatalogitem"):
            raise PermissionDenied("Você não tem permissão para esta ação.")

    @extend_schema(
        tags=["Staff - Itens customizados"],
        summary="Listar itens customizados",
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
        request=CustomItemSerializer,
        responses={201: CustomItemSerializer},
    )
    def post(self, request):
        self.require(request, "add")
        serializer = CustomItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if "image" not in serializer.validated_data:
            raise serializers.ValidationError({"image": "Imagem obrigatória."})
        row = self.resolve(UpsertCustomItemUseCase).execute(
            UpsertCustomItemInput(validated_data=serializer.validated_data)
        )
        return Response(CustomItemSerializer(row).data, status=201)


class CustomItemDetailView(CustomItemsView):
    """Atualiza um item customizado mediante as permissões exigidas."""

    @extend_schema(
        tags=["Staff - Itens customizados"],
        summary="Detalhe do item customizado",
        responses=CustomItemSerializer,
    )
    def get(self, request, item_uuid):
        row = self.resolve(GetCustomItemUseCase).execute(item_uuid)
        return Response(CustomItemSerializer(row).data)

    @extend_schema(
        tags=["Staff - Itens customizados"],
        summary="Método não permitido",
        responses={405: None},
    )
    def post(self, request, item_uuid):
        return Response(status=405)

    @extend_schema(
        tags=["Staff - Itens customizados"],
        summary="Atualizar item customizado",
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
