from rest_framework import serializers


class CreateAuctionSerializer(serializers.Serializer):
    """Valida item, quantidade, lance mínimo e duração para criar um leilão.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``inventory_id``, ``item_id``, ``quantity``, ``enchant``, ``min_bid``,
    ``hours``.
    """

    inventory_id = serializers.UUIDField()
    item_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1)
    enchant = serializers.IntegerField(min_value=0, default=0)
    min_bid = serializers.DecimalField(max_digits=12, decimal_places=2)
    hours = serializers.IntegerField(min_value=1, max_value=168, default=24)


class PlaceBidSerializer(serializers.Serializer):
    """Valida valor do lance e personagem de destino; prazo e saldo são verificados no caso de uso.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``amount``, ``character_name``.
    """

    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    character_name = serializers.CharField(max_length=35)
