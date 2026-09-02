from rest_framework import serializers


class ShopItemSerializer(serializers.Serializer):
    """Representa um produto da loja com seu UUID, item do jogo, preço e quantidade.

    Use ``Serializer(instancia).data`` (com o nome desta classe) para representar a saída;
    ``many=True`` representa uma coleção.

    Campos declarados: ``id``, ``name``, ``item_id``, ``price``, ``quantity``.
    """

    id = serializers.UUIDField()
    name = serializers.CharField()
    item_id = serializers.IntegerField()
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    quantity = serializers.IntegerField()


class AddToCartSerializer(serializers.Serializer):
    """Valida produto e quantidade para inclusão no carrinho.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``item_id``, ``quantity``.
    """

    item_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1, max_value=99, default=1)


class UpdateCartItemSerializer(serializers.Serializer):
    """Valida a nova quantidade de uma linha do carrinho; zero solicita remoção.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``quantity``.
    """

    quantity = serializers.IntegerField(min_value=0, max_value=99)
