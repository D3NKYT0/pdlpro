from rest_framework import serializers


class CreateListingSerializer(serializers.Serializer):
    """Valida personagem, preço e dados do anúncio de venda no marketplace.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``login``, ``char_id``, ``price``, ``notes``.
    """

    login = serializers.CharField(max_length=45, required=False, allow_blank=True, default="")
    char_id = serializers.IntegerField(min_value=1)
    price = serializers.DecimalField(max_digits=12, decimal_places=2)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
