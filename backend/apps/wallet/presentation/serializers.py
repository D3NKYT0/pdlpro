from rest_framework import serializers


class WalletSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    bonus_balance = serializers.DecimalField(max_digits=12, decimal_places=2)


class TransferSerializer(serializers.Serializer):
    recipient_username = serializers.CharField(max_length=16)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    description = serializers.CharField(required=False, allow_blank=True)
