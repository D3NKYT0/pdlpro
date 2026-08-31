from rest_framework import serializers


class CreateAuctionSerializer(serializers.Serializer):
    inventory_id = serializers.UUIDField()
    item_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1)
    enchant = serializers.IntegerField(min_value=0, default=0)
    min_bid = serializers.DecimalField(max_digits=12, decimal_places=2)
    hours = serializers.IntegerField(min_value=1, max_value=168, default=24)


class PlaceBidSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    character_name = serializers.CharField(max_length=35)
