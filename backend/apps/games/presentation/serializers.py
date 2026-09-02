from rest_framework import serializers


class BuyTokensSerializer(serializers.Serializer):
    """Contrato de dados de ``BuyTokensSerializer`` na API de games.

    Campos declarados: ``amount``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

    amount = serializers.IntegerField(min_value=1, max_value=1000)


class BuyBoxSerializer(serializers.Serializer):
    """Contrato de dados de ``BuyBoxSerializer`` na API de games.

    Campos declarados: ``box_type_id``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

    box_type_id = serializers.UUIDField()


class TransferBagSerializer(serializers.Serializer):
    """Contrato de dados de ``TransferBagSerializer`` na API de games.

    Campos declarados: ``inventory_id``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

    inventory_id = serializers.UUIDField()


class PlayDiceSerializer(serializers.Serializer):
    """Contrato de dados de ``PlayDiceSerializer`` na API de games.

    Campos declarados: ``bet_type``, ``amount``, ``number``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

    bet_type = serializers.ChoiceField(choices=["even", "odd", "high", "low", "number"])
    amount = serializers.IntegerField(min_value=1, max_value=1000)
    number = serializers.IntegerField(min_value=1, max_value=6, required=False)
