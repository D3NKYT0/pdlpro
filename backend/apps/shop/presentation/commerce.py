from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.shop.application.commerce import get_promo, quote
from apps.shop.infrastructure.models import (
    Cart,
    CartPackage,
    PromotionCode,
    ShopItem,
    ShopPackage,
    ShopPackageItem,
    ShopPurchase,
)
from apps.programs.models import Supporter
from common.permissions import IsStaffMember


class PackageItemSerializer(serializers.Serializer):
    item = serializers.SlugRelatedField(
        slug_field="id", queryset=ShopItem.objects.all()
    )
    quantity = serializers.IntegerField(min_value=1, max_value=100000)


class PackageSerializer(serializers.ModelSerializer):
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

    @transaction.atomic
    def create(self, data):
        items = data.pop("items")
        pack = ShopPackage.objects.create(**data)
        for item in items:
            ShopPackageItem.objects.create(package=pack, **item)
        return pack

    @transaction.atomic
    def update(self, instance, data):
        items = data.pop("items", None)
        instance = super().update(instance, data)
        if items is not None:
            instance.package_items.all().delete()
            for item in items:
                ShopPackageItem.objects.create(package=instance, **item)
        return instance


class PromoSerializer(serializers.ModelSerializer):
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
    promo_code = serializers.CharField(max_length=40, allow_blank=True, required=False)
    use_bonus = serializers.BooleanField(required=False)


class CartPackageSerializer(serializers.Serializer):
    package_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=0, max_value=99, default=1)


class CommerceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, section):
        if section == "packages":
            return Response(
                PackageSerializer(
                    ShopPackage.objects.filter(active=True), many=True
                ).data
            )
        if section == "purchases":
            rows = ShopPurchase.objects.filter(user=request.user).order_by(
                "-created_at"
            )[:100]
            return Response(
                [
                    {
                        "id": str(r.id),
                        "total": str(r.total),
                        "subtotal": str(r.subtotal),
                        "discount": str(r.discount),
                        "bonus_used": str(r.bonus_used),
                        "promo_code": r.promo_code,
                        "items": r.items_snapshot,
                        "created_at": r.created_at,
                    }
                    for r in rows
                ]
            )
        if section != "quote":
            raise NotFound()
        cart, _ = Cart.objects.get_or_create(user=request.user)
        return Response(quote(cart, request.user)[0])

    @transaction.atomic
    def post(self, request, section):
        if section not in ("packages", "options"):
            raise NotFound()
        type(request.user).objects.select_for_update().get(pk=request.user.pk)
        cart, _ = Cart.objects.get_or_create(user=request.user)
        cart = Cart.objects.select_for_update().get(pk=cart.pk)
        if section == "packages":
            serializer = CartPackageSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            data = serializer.validated_data
            pack = get_object_or_404(ShopPackage, id=data["package_id"], active=True)
            if data["quantity"] == 0:
                CartPackage.objects.filter(cart=cart, package=pack).delete()
            else:
                CartPackage.objects.update_or_create(
                    cart=cart, package=pack, defaults={"quantity": data["quantity"]}
                )
        else:
            serializer = CartOptionsSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            for key, value in serializer.validated_data.items():
                if key == "promo_code":
                    value = value.strip().upper()
                    get_promo(value, request.user)
                setattr(cart, key, value)
            cart.save()
        return Response(quote(cart, request.user)[0])


class StaffCommerceView(APIView):
    permission_classes = [IsAuthenticated, IsStaffMember]

    def config(self, section):
        if section not in ("packages", "promos"):
            raise NotFound()
        return (
            (ShopPackage, PackageSerializer)
            if section == "packages"
            else (PromotionCode, PromoSerializer)
        )

    def get(self, request, section):
        model, serializer = self.config(section)
        return Response(serializer(model.objects.all(), many=True).data)

    def post(self, request, section):
        _, cls = self.config(section)
        serializer = cls(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=201)

    def patch(self, request, section, entry_id):
        model, cls = self.config(section)
        serializer = cls(
            get_object_or_404(model, id=entry_id), data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
