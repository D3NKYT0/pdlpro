from io import BytesIO

from PIL import Image, ImageOps
from django.core.files.base import ContentFile
from django.db import IntegrityError, transaction
from django.core.paginator import Paginator
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.server.infrastructure.custom_item_models import CustomCatalogItem, ITEM_CATEGORIES, ITEM_GRADES
from apps.server.infrastructure.lineage.item_catalog import get_xml_catalog
from common.permissions import IsStaffMember


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
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``image``, ``icon_url``, ``conflicts_with_xml``.
    """

    image = serializers.ImageField(write_only=True)
    icon_url = serializers.SerializerMethodField()
    conflicts_with_xml = serializers.SerializerMethodField()

    class Meta:
        model = CustomCatalogItem
        fields = ("id", "item_id", "name", "image", "icon_url", "category", "grade", "tradeable",
                  "metadata", "active", "conflicts_with_xml", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")

    def get_icon_url(self, obj):
        return obj.image.url if obj.image else None

    def get_conflicts_with_xml(self, obj):
        return get_xml_catalog().get(obj.item_id) is not None

    def validate(self, attrs):
        item_id = attrs.get("item_id", self.instance.item_id if self.instance else None)
        if self.instance and item_id != self.instance.item_id:
            raise serializers.ValidationError({"item_id": "O ID não pode ser alterado após o cadastro."})
        active = attrs.get("active", self.instance.active if self.instance else True)
        if (not self.instance or active) and get_xml_catalog().get(item_id):
            raise serializers.ValidationError({"item_id": "Este ID já pertence ao catálogo XML."})
        return attrs

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
                # Re-encoding strips EXIF, arbitrary appended data and user filenames.
                sanitized = Image.new("RGBA", clean.size)
                sanitized.paste(clean)
                output = BytesIO()
                sanitized.save(output, format="PNG")
            return ContentFile(output.getvalue(), name="icon.png")
        except (OSError, ValueError, Image.DecompressionBombError):
            raise serializers.ValidationError("Imagem inválida.") from None

    def persist(self, instance, validated_data):
        old_image = instance.image.name if instance.image else None
        for key, value in validated_data.items():
            setattr(instance, key, value)
        try:
            with transaction.atomic():
                instance.save()
        except IntegrityError:
            if instance.image and instance.image.name != old_image and instance.image._committed:
                instance.image.delete(save=False)
            raise serializers.ValidationError({"item_id": "Este ID já está cadastrado."}) from None
        return instance

    def create(self, validated_data):
        return self.persist(CustomCatalogItem(), validated_data)

    def update(self, instance, validated_data):
        return self.persist(instance, validated_data)


class CustomItemQuery(serializers.Serializer):
    """Valida os filtros de pesquisa do catálogo administrativo de itens customizados.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``search``, ``page``.
    """

    search = serializers.CharField(default="", allow_blank=True, max_length=100)
    page = serializers.IntegerField(default=1, min_value=1, max_value=1000000)


class CustomItemsView(APIView):
    """Pesquisa e cria metadados de itens customizados no catálogo administrativo.

    Implementa GET, POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated, IsStaffMember, CanViewCustomItems].
    """

    permission_classes = [IsAuthenticated, IsStaffMember, CanViewCustomItems]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def require(self, request, action):
        if not request.user.has_perm(f"server.{action}_customcatalogitem"):
            raise PermissionDenied("Você não tem permissão para esta ação.")

    def get(self, request):
        options = CustomItemQuery(data=request.query_params)
        options.is_valid(raise_exception=True)
        search = options.validated_data["search"]
        rows = CustomCatalogItem.objects.all()
        if search:
            match = Q(name__icontains=search)
            if search.isascii() and search.isdigit() and len(search) <= 10:
                match |= Q(item_id=int(search))
            rows = rows.filter(match)
        page = Paginator(rows, 24).get_page(options.validated_data["page"])
        return Response({"results": CustomItemSerializer(page, many=True).data,
            "count": page.paginator.count, "page": page.number, "pages": page.paginator.num_pages,
            "permissions": {action: request.user.has_perm(f"server.{action}_customcatalogitem") for action in ("add", "change")},
            "categories": [{"value": key, "label": label} for key, label in ITEM_CATEGORIES],
            "grades": [{"value": key, "label": label} for key, label in ITEM_GRADES]})

    def post(self, request):
        self.require(request, "add")
        serializer = CustomItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=201)


class CustomItemDetailView(CustomItemsView):
    """Atualiza ou exclui um item customizado mediante as permissões exigidas para a ação.

    Implementa GET, POST, PATCH; registre ``as_view()`` nas URLs do módulo. Usa as permissões
    herdadas da base ou definidas nos padrões do DRF.
    """

    def get(self, request, item_uuid):
        return Response(CustomItemSerializer(get_object_or_404(CustomCatalogItem, id=item_uuid)).data)

    def post(self, request, item_uuid):
        return Response(status=405)

    def patch(self, request, item_uuid):
        self.require(request, "change")
        serializer = CustomItemSerializer(get_object_or_404(CustomCatalogItem, id=item_uuid), data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
