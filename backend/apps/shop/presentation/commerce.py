from django.utils.translation import gettext as _
from django.utils.translation import gettext_lazy
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.shop.application.commerce_use_cases import (
    CreateStaffPackageInput,
    CreateStaffPackageUseCase,
    CreateStaffPromoInput,
    CreateStaffPromoUseCase,
    GetStaffPackageUseCase,
    GetStaffPromoUseCase,
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
from common.architecture.exceptions import EntityNotFoundError
from common.permissions import IsStaffMember
from common.views import InjectedAPIView


class PackageItemSerializer(serializers.Serializer):
    """Representa e valida os itens que compõem um pacote da loja."""

    item = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1, max_value=100000)


class PackageSerializer(serializers.Serializer):
    """Representa e valida o pacote comercial e sua composição (entrada/saída em dict)."""

    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(max_length=100)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
    active = serializers.BooleanField(default=True)
    items = PackageItemSerializer(many=True, write_only=True, required=False)
    contents = serializers.ListField(child=serializers.DictField(), read_only=True)

    def validate_items(self, items):
        if items is not None and not items:
            raise serializers.ValidationError(_("Inclua pelo menos um item."))
        return items


class PromoSerializer(serializers.Serializer):
    """Representa e valida um código promocional (entrada/saída em dict)."""

    id = serializers.UUIDField(read_only=True)
    code = serializers.CharField(max_length=40)
    percent = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=0, max_value=100)
    active = serializers.BooleanField(default=True)
    starts_at = serializers.DateTimeField(allow_null=True, required=False)
    ends_at = serializers.DateTimeField(allow_null=True, required=False)
    max_uses = serializers.IntegerField(min_value=0, default=0)
    uses = serializers.IntegerField(read_only=True)
    supporter = serializers.UUIDField(allow_null=True, required=False, source="supporter_id")

    def validate_code(self, code):
        return code.strip().upper()

    def validate(self, data):
        start = data.get("starts_at")
        end = data.get("ends_at")
        if self.partial and self.instance:
            start = data.get("starts_at", self.instance.get("starts_at"))
            end = data.get("ends_at", self.instance.get("ends_at"))
        if start and end and start >= end:
            raise serializers.ValidationError(
                _("A data final deve ser posterior à inicial.")
            )
        return data


class CartOptionsSerializer(serializers.Serializer):
    """Valida as opções de compra associadas ao carrinho."""

    promo_code = serializers.CharField(max_length=40, allow_blank=True, required=False)
    use_bonus = serializers.BooleanField(required=False)


class CartPackageSerializer(serializers.Serializer):
    """Valida a seleção e a quantidade de pacotes no carrinho."""

    package_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=0, max_value=99, default=1)


class CommerceView(InjectedAPIView):
    """Trata pacotes, opções e histórico de compras do comércio para o usuário da sessão."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Comércio"],
        summary=gettext_lazy("Consultar seção do comércio"),
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
        summary=gettext_lazy("Atualizar carrinho do comércio"),
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
    """Administra pacotes e promoções do comércio via casos de uso."""

    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(
        tags=["Comércio"],
        summary=gettext_lazy("Listar pacotes ou promoções (staff)"),
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
        summary=gettext_lazy("Criar pacote ou promoção (staff)"),
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
            items = data.get("items")
            if not items:
                raise serializers.ValidationError({"items": _("Inclua pelo menos um item.")})
            pack = self.resolve(CreateStaffPackageUseCase).execute(
                CreateStaffPackageInput(
                    name=data["name"],
                    total_price=data["total_price"],
                    active=data.get("active", True),
                    items=[
                        {"item": row["item"], "quantity": row["quantity"]}
                        for row in items
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
        summary=gettext_lazy("Atualizar pacote ou promoção (staff)"),
        description=(
            "Atualiza parcialmente um pacote ou promoção identificado por entry_id, "
            "conforme a seção (packages/promos)."
        ),
        request=PackageSerializer,
        responses=PackageSerializer,
    )
    def patch(self, request, section, entry_id):
        if section == "packages":
            try:
                pack = self.resolve(GetStaffPackageUseCase).execute(entry_id)
            except EntityNotFoundError as exc:
                raise NotFound() from exc
            serializer = PackageSerializer(pack, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            data = dict(serializer.validated_data)
            items = data.pop("items", None)
            pack = self.resolve(UpdateStaffPackageUseCase).execute(
                UpdateStaffPackageInput(
                    package_id=entry_id,
                    fields=data,
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
            try:
                promo = self.resolve(GetStaffPromoUseCase).execute(entry_id)
            except EntityNotFoundError as exc:
                raise NotFound() from exc
            serializer = PromoSerializer(promo, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            promo = self.resolve(UpdateStaffPromoUseCase).execute(
                UpdateStaffPromoInput(
                    promo_id=entry_id, fields=dict(serializer.validated_data)
                )
            )
            return Response(PromoSerializer(promo).data)
        raise NotFound()
