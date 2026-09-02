from rest_framework import serializers


class ShopItemSerializer(serializers.Serializer):
    """Contrato de dados de ``ShopItemSerializer`` na API de shop.

    Campos declarados: ``id``, ``name``, ``item_id``, ``price``, ``quantity``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

    id = serializers.UUIDField()
    name = serializers.CharField()
    item_id = serializers.IntegerField()
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    quantity = serializers.IntegerField()


class AddToCartSerializer(serializers.Serializer):
    """Contrato de dados de ``AddToCartSerializer`` na API de shop.

    Campos declarados: ``item_id``, ``quantity``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

    item_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1, max_value=99, default=1)


class UpdateCartItemSerializer(serializers.Serializer):
    """Contrato de dados de ``UpdateCartItemSerializer`` na API de shop.

    Campos declarados: ``quantity``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

    quantity = serializers.IntegerField(min_value=0, max_value=99)
