from django.conf import settings
from rest_framework import serializers

from common.currency_identity import configured_coin_name


class WalletSerializer(serializers.Serializer):
    """Representa o UUID da carteira e seus saldos separados de moedas principais e bônus.

    Use ``Serializer(instancia).data`` (com o nome desta classe) para representar a saída;
    ``many=True`` representa uma coleção.

    Campos declarados: ``id``, ``balance``, ``bonus_balance``, ``display_name``, ``coin_name``.
    O nome vem da configuração da instalação; vazio preserva o título do tema na SPA.
    """

    coin_name = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()

    def get_coin_name(self, obj) -> str:
        """Identidade da moeda virtual, independente do item usado no câmbio do jogo."""
        return configured_coin_name()

    def get_display_name(self, obj) -> str:
        """Expõe apenas o nome visual configurado, sem alterar saldos ou identidade da carteira."""
        return (getattr(settings, "WALLET_DISPLAY_NAME", "") or "").strip()

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
