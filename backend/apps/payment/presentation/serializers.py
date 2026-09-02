from rest_framework import serializers


class CreatePaymentOrderSerializer(serializers.Serializer):
    """Valida valor ou pacote, moeda e método da compra de moedas do painel.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``amount``, ``method``, ``currency``, ``package_id``.
    """

    amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    method = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")
    currency = serializers.ChoiceField(choices=["BRL", "USD"], default="BRL")
    package_id = serializers.CharField(required=False, allow_blank=True, default="")


class PreviewBonusSerializer(serializers.Serializer):
    """Valida os parâmetros da cotação e da prévia de bônus, sem criar pedido.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``amount``, ``currency``, ``package_id``.
    """

    amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0)
    currency = serializers.ChoiceField(choices=["BRL", "USD"], default="BRL")
    package_id = serializers.CharField(required=False, allow_blank=True, default="")
