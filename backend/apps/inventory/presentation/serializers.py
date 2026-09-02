from rest_framework import serializers


class WithdrawSerializer(serializers.Serializer):
    """Valida os identificadores e a quantidade de itens a retirar do jogo para o painel.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``login``, ``char_id``, ``item_id``, ``quantity``.
    """

    login = serializers.CharField(required=False, allow_blank=True)
    char_id = serializers.IntegerField()
    item_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)


class DepositSerializer(serializers.Serializer):
    """Valida os identificadores, a quantidade e o encantamento dos itens a enviar ao jogo.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``login``, ``inventory_id``, ``item_id``, ``quantity``, ``enchant``.
    """

    login = serializers.CharField(required=False, allow_blank=True)
    inventory_id = serializers.UUIDField()
    item_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    enchant = serializers.IntegerField(min_value=0, default=0)


class TradeSerializer(serializers.Serializer):
    """Valida a movimentação de itens entre inventários do painel.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``origin_inventory_id``, ``destination_inventory_id``, ``item_id``,
    ``quantity``, ``enchant``.
    """

    origin_inventory_id = serializers.UUIDField()
    destination_inventory_id = serializers.UUIDField()
    item_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    enchant = serializers.IntegerField(min_value=0, default=0)
