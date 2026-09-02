from rest_framework import serializers


class WalletSerializer(serializers.Serializer):
    """Contrato de dados de ``WalletSerializer`` na API de wallet.

    Campos declarados: ``id``, ``balance``, ``bonus_balance``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

    id = serializers.UUIDField()
    balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    bonus_balance = serializers.DecimalField(max_digits=12, decimal_places=2)


class TransferSerializer(serializers.Serializer):
    """Contrato de dados de ``TransferSerializer`` na API de wallet.

    Campos declarados: ``recipient_username``, ``amount``, ``description``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

    recipient_username = serializers.CharField(max_length=16)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    description = serializers.CharField(required=False, allow_blank=True)
