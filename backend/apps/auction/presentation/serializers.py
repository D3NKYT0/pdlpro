from rest_framework import serializers


class CreateAuctionSerializer(serializers.Serializer):
    """Contrato de dados de ``CreateAuctionSerializer`` na API de auction.

    Campos declarados: ``inventory_id``, ``item_id``, ``quantity``, ``enchant``, ``min_bid``,
    ``hours``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

    inventory_id = serializers.UUIDField()
    item_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1)
    enchant = serializers.IntegerField(min_value=0, default=0)
    min_bid = serializers.DecimalField(max_digits=12, decimal_places=2)
    hours = serializers.IntegerField(min_value=1, max_value=168, default=24)


class PlaceBidSerializer(serializers.Serializer):
    """Contrato de dados de ``PlaceBidSerializer`` na API de auction.

    Campos declarados: ``amount``, ``character_name``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    character_name = serializers.CharField(max_length=35)
