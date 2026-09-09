from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.programs.models import Supporter
from apps.shop.application.commerce_use_cases import (
    CreateStaffPackageInput,
    CreateStaffPackageUseCase,
    CreateStaffPromoInput,
    CreateStaffPromoUseCase,
    ListActivePackagesUseCase,
    ListPurchasesUseCase,
    ListStaffPackagesUseCase,
    ListStaffPromosUseCase,
    QuoteCartUseCase,
    SetCartOptionsInput,
    SetCartOptionsUseCase,
    SetCartPackageInput,
    SetCartPackageUseCase,
    UpdateStaffPackageInput,
    UpdateStaffPackageUseCase,
    UpdateStaffPromoInput,
    UpdateStaffPromoUseCase,
    UserScopedInput,
)
from apps.shop.infrastructure.models import PromotionCode, ShopItem, ShopPackage
from common.permissions import IsStaffMember
from common.views import InjectedAPIView


class PackageItemSerializer(serializers.Serializer):
    """Representa e valida os itens que compõem um pacote da loja.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``item``, ``quantity``.
    """

    item = serializers.SlugRelatedField(
        slug_field="id", queryset=ShopItem.objects.all()
    )
    quantity = serializers.IntegerField(min_value=1, max_value=100000)


class PackageSerializer(serializers.ModelSerializer):
    """Representa e valida o pacote comercial e sua composição.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador. Persistência fica nos casos de uso.

    Campos declarados: ``items``, ``contents``.
    """

    items = PackageItemSerializer(many=True, write_only=True)
    contents = serializers.SerializerMethodField()

    class Meta:
        model = ShopPackage
        fields = ["id", "name", "total_price", "active", "items", "contents"]
        extra_kwargs = {"total_price": {"min_value": 0}}

    def get_contents(self, obj):
        return [
            {
                "item": str(row.item.id),
                "item_id": row.item.item_id,
                "name": row.item.name,
                "quantity": row.quantity,
                "grant_quantity": row.quantity * row.item.quantity,
            }
            for row in obj.package_items.select_related("item")
        ]

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError("Inclua pelo menos um item.")
        return items


class PromoSerializer(serializers.ModelSerializer):
    """Representa e valida um código promocional e suas condições de uso.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``supporter``.
    """

    supporter = serializers.SlugRelatedField(
        slug_field="id",
        queryset=Supporter.objects.filter(status="approved"),
        allow_null=True,
        required=False,
    )

    class Meta:
        model = PromotionCode
        fields = [
            "id",
            "code",
            "percent",
            "active",
            "starts_at",
            "ends_at",
            "max_uses",
            "uses",
            "supporter",
        ]
        read_only_fields = ["id", "uses"]
        extra_kwargs = {"percent": {"min_value": 0, "max_value": 100}}

    def validate_code(self, code):
        code = code.strip().upper()
        rows = PromotionCode.objects.filter(code=code)
        if self.instance:
            rows = rows.exclude(pk=self.instance.pk)
        if rows.exists():
            raise serializers.ValidationError("Este código já existe.")
        return code

    def validate(self, data):
        start = data.get("starts_at", getattr(self.instance, "starts_at", None))
        end = data.get("ends_at", getattr(self.instance, "ends_at", None))
        if start and end and start >= end:
            raise serializers.ValidationError(
                "A data final deve ser posterior à inicial."
            )
        return data


class CartOptionsSerializer(serializers.Serializer):
    """Valida as opções de compra associadas ao carrinho.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``promo_code``, ``use_bonus``.
    """

    promo_code = serializers.CharField(max_length=40, allow_blank=True, required=False)
    use_bonus = serializers.BooleanField(required=False)


class CartPackageSerializer(serializers.Serializer):
    """Valida a seleção e a quantidade de pacotes no carrinho.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``package_id``, ``quantity``.
    """

    package_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=0, max_value=99, default=1)


class CommerceView(InjectedAPIView):
    """Trata pacotes, opções e histórico de compras do comércio para o usuário da sessão.

    Implementa GET, POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated].
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Comércio"],
        summary="Consultar seção do comércio",
        description=(
            "Consulta a seção informada no path: pacotes ativos (packages), histórico "
            "de compras (purchases) ou cotação atual do carrinho (quote)."
        ),
        responses=PackageSerializer(many=True),
    )
    def get(self, request, section):
        if section == "packages":
            return Response(
                PackageSerializer(
                    self.resolve(ListActivePackagesUseCase).execute(None), many=True
                ).data
            )
        if section == "purchases":
            return Response(
                self.resolve(ListPurchasesUseCase).execute(
                    UserScopedInput(user_id=request.user.id)
                )
            )
        if section != "quote":
            raise NotFound()
        return Response(
            self.resolve(QuoteCartUseCase).execute(UserScopedInput(user_id=request.user.id))
        )

    @extend_schema(
        tags=["Comércio"],
        summary="Atualizar carrinho do comércio",
        description=(
            "Atualiza a seção informada: pacotes no carrinho (packages, via "
            "CartPackageSerializer) ou opções de compra (options, via "
            "CartOptionsSerializer). Retorna a cotação atualizada."
        ),
        request=CartPackageSerializer,
    )
    def post(self, request, section):
        if section not in ("packages", "options"):
            raise NotFound()
        if section == "packages":
            serializer = CartPackageSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            data = serializer.validated_data
            return Response(
                self.resolve(SetCartPackageUseCase).execute(
                    SetCartPackageInput(
                        user_id=request.user.id,
                        package_id=data["package_id"],
                        quantity=data["quantity"],
                    )
                )
            )
        serializer = CartOptionsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(
            self.resolve(SetCartOptionsUseCase).execute(
                SetCartOptionsInput(
                    user_id=request.user.id,
                    promo_code=serializer.validated_data.get("promo_code"),
                    use_bonus=serializer.validated_data.get("use_bonus"),
                )
            )
        )


class StaffCommerceView(InjectedAPIView):
    """Administra pacotes e promoções do comércio via casos de uso.

    Implementa GET, POST, PATCH; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated, IsStaffMember].
    """

    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(
        tags=["Comércio"],
        summary="Listar pacotes ou promoções (staff)",
        description=(
            "Lista pacotes (packages) ou códigos promocionais (promos) conforme a "
            "seção do path. Respostas tipadas com PackageSerializer ou PromoSerializer."
        ),
        responses=PackageSerializer(many=True),
    )
    def get(self, request, section):
        if section == "packages":
            return Response(
                PackageSerializer(
                    self.resolve(ListStaffPackagesUseCase).execute(None), many=True
                ).data
            )
        if section == "promos":
            return Response(
                PromoSerializer(
                    self.resolve(ListStaffPromosUseCase).execute(None), many=True
                ).data
            )
        raise NotFound()

    @extend_schema(
        tags=["Comércio"],
        summary="Criar pacote ou promoção (staff)",
        description=(
            "Cria um pacote (packages, PackageSerializer) ou um código promocional "
            "(promos, PromoSerializer) conforme a seção do path."
        ),
        request=PackageSerializer,
        responses=PackageSerializer,
    )
    def post(self, request, section):
        if section == "packages":
            serializer = PackageSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            data = serializer.validated_data
            pack = self.resolve(CreateStaffPackageUseCase).execute(
                CreateStaffPackageInput(
                    name=data["name"],
                    total_price=data["total_price"],
                    active=data.get("active", True),
                    items=[
                        {"item": row["item"], "quantity": row["quantity"]}
                        for row in data["items"]
                    ],
                )
            )
            return Response(PackageSerializer(pack).data, status=201)
        if section == "promos":
            serializer = PromoSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            promo = self.resolve(CreateStaffPromoUseCase).execute(
                CreateStaffPromoInput(fields=dict(serializer.validated_data))
            )
            return Response(PromoSerializer(promo).data, status=201)
        raise NotFound()

    @extend_schema(
        tags=["Comércio"],
        summary="Atualizar pacote ou promoção (staff)",
        description=(
            "Atualiza parcialmente um pacote ou promoção identificado por entry_id, "
            "conforme a seção (packages/promos)."
        ),
        request=PackageSerializer,
        responses=PackageSerializer,
    )
    def patch(self, request, section, entry_id):
        if section == "packages":
            pack = ShopPackage.objects.filter(id=entry_id).first()
            if pack is None:
                raise NotFound()
            serializer = PackageSerializer(pack, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            data = serializer.validated_data
            items = data.pop("items", None)
            pack = self.resolve(UpdateStaffPackageUseCase).execute(
                UpdateStaffPackageInput(
                    package_id=entry_id,
                    fields=dict(data),
                    items=(
                        [
                            {"item": row["item"], "quantity": row["quantity"]}
                            for row in items
                        ]
                        if items is not None
                        else None
                    ),
                )
            )
            return Response(PackageSerializer(pack).data)
        if section == "promos":
            promo = PromotionCode.objects.filter(id=entry_id).first()
            if promo is None:
                raise NotFound()
            serializer = PromoSerializer(promo, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            promo = self.resolve(UpdateStaffPromoUseCase).execute(
                UpdateStaffPromoInput(
                    promo_id=entry_id, fields=dict(serializer.validated_data)
                )
            )
            return Response(PromoSerializer(promo).data)
        raise NotFound()
