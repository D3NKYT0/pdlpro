from rest_framework import serializers


class WithdrawSerializer(serializers.Serializer):
    login = serializers.CharField(required=False, allow_blank=True)
    char_id = serializers.IntegerField()
    item_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)


class DepositSerializer(serializers.Serializer):
    login = serializers.CharField(required=False, allow_blank=True)
    inventory_id = serializers.UUIDField()
    item_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    enchant = serializers.IntegerField(min_value=0, default=0)


class TradeSerializer(serializers.Serializer):
    origin_inventory_id = serializers.UUIDField()
    destination_inventory_id = serializers.UUIDField()
    item_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    enchant = serializers.IntegerField(min_value=0, default=0)
