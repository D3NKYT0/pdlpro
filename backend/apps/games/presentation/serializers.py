from rest_framework import serializers


class BuyTokensSerializer(serializers.Serializer):
    amount = serializers.IntegerField(min_value=1, max_value=1000)
