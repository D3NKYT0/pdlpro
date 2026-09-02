from rest_framework import serializers


class WalletSerializer(serializers.Serializer):
    """Representa o UUID da carteira e seus saldos separados de moedas principais e bônus.

    Use ``Serializer(instancia).data`` (com o nome desta classe) para representar a saída;
    ``many=True`` representa uma coleção.

    Campos declarados: ``id``, ``balance``, ``bonus_balance``.
    """

    id = serializers.UUIDField()
    balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    bonus_balance = serializers.DecimalField(max_digits=12, decimal_places=2)


class TransferSerializer(serializers.Serializer):
    """Valida destinatário, quantidade de moedas e descrição da transferência. O remetente vem da
    sessão; saldo e valor positivo são conferidos no caso de uso.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``recipient_username``, ``amount``, ``description``.
    """

    recipient_username = serializers.CharField(max_length=16)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    description = serializers.CharField(required=False, allow_blank=True)
