from rest_framework import serializers


class BuyTokensSerializer(serializers.Serializer):
    amount = serializers.IntegerField(min_value=1, max_value=1000)


class BuyBoxSerializer(serializers.Serializer):
    box_type_id = serializers.UUIDField()


class TransferBagSerializer(serializers.Serializer):
    inventory_id = serializers.UUIDField()


class PlayDiceSerializer(serializers.Serializer):
    bet_type = serializers.ChoiceField(choices=["even", "odd", "high", "low", "number"])
    amount = serializers.IntegerField(min_value=1, max_value=1000)
    number = serializers.IntegerField(min_value=1, max_value=6, required=False)
