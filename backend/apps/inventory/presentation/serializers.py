from rest_framework import serializers


class WithdrawSerializer(serializers.Serializer):
    """Contrato de dados de ``WithdrawSerializer`` na API de inventory.

    Campos declarados: ``login``, ``char_id``, ``item_id``, ``quantity``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

    login = serializers.CharField(required=False, allow_blank=True)
    char_id = serializers.IntegerField()
    item_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)


class DepositSerializer(serializers.Serializer):
    """Contrato de dados de ``DepositSerializer`` na API de inventory.

    Campos declarados: ``login``, ``inventory_id``, ``item_id``, ``quantity``, ``enchant``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

    login = serializers.CharField(required=False, allow_blank=True)
    inventory_id = serializers.UUIDField()
    item_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    enchant = serializers.IntegerField(min_value=0, default=0)


class TradeSerializer(serializers.Serializer):
    """Contrato de dados de ``TradeSerializer`` na API de inventory.

    Campos declarados: ``origin_inventory_id``, ``destination_inventory_id``, ``item_id``,
    ``quantity``, ``enchant``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

    origin_inventory_id = serializers.UUIDField()
    destination_inventory_id = serializers.UUIDField()
    item_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    enchant = serializers.IntegerField(min_value=0, default=0)
