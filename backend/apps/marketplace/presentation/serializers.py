from rest_framework import serializers

from apps.wallet.presentation.fields import WholeCoinsField


class CreateListingSerializer(serializers.Serializer):
    """Valida personagem, preço e dados do anúncio de venda no marketplace.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``login``, ``char_id``, ``price``, ``notes``.
    """

    login = serializers.CharField(max_length=45, required=False, allow_blank=True, default="")
    char_id = serializers.IntegerField(min_value=1)
    price = WholeCoinsField(max_digits=12, decimal_places=2)
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class PurchaseListingSerializer(serializers.Serializer):
    """Valida a conta de jogo que recebe o personagem comprado.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)``. O caso de uso
    confirma que ``login`` está vinculado ao comprador; vazio usa o nome de usuário.

    Campos declarados: ``login``.
    """

    login = serializers.CharField(max_length=45, required=False, allow_blank=True, default="")
