from rest_framework import serializers


class BuyTokensSerializer(serializers.Serializer):
    """Valida a quantidade de fichas solicitada para compra com saldo da carteira.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``amount``.
    """

    amount = serializers.IntegerField(min_value=1, max_value=1000)


class BuyBoxSerializer(serializers.Serializer):
    """Valida o identificador do tipo de caixa que o jogador deseja comprar.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``box_type_id``.
    """

    box_type_id = serializers.UUIDField()


class TransferBagSerializer(serializers.Serializer):
    """Valida o inventário de destino para receber os itens da bag.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``inventory_id``.
    """

    inventory_id = serializers.UUIDField()


class PlayDiceSerializer(serializers.Serializer):
    """Valida o valor e o tipo de aposta do jogo de dados.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``bet_type``, ``amount``, ``number``.
    """

    bet_type = serializers.ChoiceField(choices=["even", "odd", "high", "low", "number"])
    amount = serializers.IntegerField(min_value=1, max_value=1000)
    number = serializers.IntegerField(min_value=1, max_value=6, required=False)
