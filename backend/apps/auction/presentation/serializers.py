from rest_framework import serializers


class CreateAuctionSerializer(serializers.Serializer):
    """Valida criação de leilão de item ou personagem conforme ``kind``.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.
    """

    kind = serializers.ChoiceField(choices=["item", "character"], default="item")
    inventory_id = serializers.UUIDField(required=False)
    item_id = serializers.IntegerField(min_value=1, required=False)
    quantity = serializers.IntegerField(min_value=1, required=False)
    enchant = serializers.IntegerField(min_value=0, default=0, required=False)
    login = serializers.CharField(required=False, allow_blank=True, max_length=45)
    char_id = serializers.IntegerField(min_value=1, required=False)
    min_bid = serializers.DecimalField(max_digits=12, decimal_places=2)
    hours = serializers.IntegerField(min_value=1, max_value=168, default=24)

    def validate(self, attrs):
        kind = attrs.get("kind") or "item"
        if kind == "item":
            missing = [name for name in ("inventory_id", "item_id", "quantity") if not attrs.get(name)]
            if missing:
                raise serializers.ValidationError(
                    {name: "Obrigatório para leilão de item." for name in missing}
                )
        else:
            if not attrs.get("char_id"):
                raise serializers.ValidationError({"char_id": "Obrigatório para leilão de personagem."})
        return attrs


class PlaceBidSerializer(serializers.Serializer):
    """Valida valor do lance; personagem de destino é obrigatório só para leilão de item.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``amount``, ``character_name``.
    """

    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    character_name = serializers.CharField(max_length=35, required=False, allow_blank=True, default="")
