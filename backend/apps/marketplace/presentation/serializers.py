from rest_framework import serializers


class CreateListingSerializer(serializers.Serializer):
    """Contrato de dados de ``CreateListingSerializer`` na API de marketplace.

    Campos declarados: ``login``, ``char_id``, ``price``, ``notes``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

    login = serializers.CharField(max_length=45, required=False, allow_blank=True, default="")
    char_id = serializers.IntegerField(min_value=1)
    price = serializers.DecimalField(max_digits=12, decimal_places=2)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
