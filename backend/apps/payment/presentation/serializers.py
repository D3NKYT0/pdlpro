from rest_framework import serializers


class CreatePaymentOrderSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    method = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")
    currency = serializers.ChoiceField(choices=["BRL", "USD"], default="BRL")
    package_id = serializers.CharField(required=False, allow_blank=True, default="")


class PreviewBonusSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0)
    currency = serializers.ChoiceField(choices=["BRL", "USD"], default="BRL")
    package_id = serializers.CharField(required=False, allow_blank=True, default="")
