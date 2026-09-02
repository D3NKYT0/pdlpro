from rest_framework import serializers


class CreatePaymentOrderSerializer(serializers.Serializer):
    """Contrato de dados de ``CreatePaymentOrderSerializer`` na API de payment.

    Campos declarados: ``amount``, ``method``, ``currency``, ``package_id``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

    amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    method = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")
    currency = serializers.ChoiceField(choices=["BRL", "USD"], default="BRL")
    package_id = serializers.CharField(required=False, allow_blank=True, default="")


class PreviewBonusSerializer(serializers.Serializer):
    """Contrato de dados de ``PreviewBonusSerializer`` na API de payment.

    Campos declarados: ``amount``, ``currency``, ``package_id``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

    amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0)
    currency = serializers.ChoiceField(choices=["BRL", "USD"], default="BRL")
    package_id = serializers.CharField(required=False, allow_blank=True, default="")
