from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from apps.wallet.domain.coins import is_whole_coins


class WholeCoinsField(serializers.DecimalField):
    """Campo de entrada para valores em moedas do site: aceita apenas números inteiros."""

    default_error_messages = {"whole_coins": _("Informe um número inteiro de moedas.")}

    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        if not is_whole_coins(value):
            self.fail("whole_coins")
        return value
