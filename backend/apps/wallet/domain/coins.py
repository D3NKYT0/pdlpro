"""Regras das moedas do site: são unidades inteiras, nunca dinheiro com centavos.

As colunas continuam decimais, então os valores saem com duas casas (``2500.00``) para manter
o contrato da API. Dinheiro real (preços em BRL/USD, taxas) não passa por aqui.
"""

from decimal import ROUND_CEILING, ROUND_FLOOR, Decimal

from common.architecture.exceptions import ValidationDomainError

_TWO_PLACES = Decimal("0.01")


def floor_coins(value) -> Decimal:
    """Arredonda para baixo: usado em créditos, bônus, comissões e taxas de retirada."""
    return Decimal(str(value)).to_integral_value(rounding=ROUND_FLOOR).quantize(_TWO_PLACES)


def ceil_coins(value) -> Decimal:
    """Arredonda para cima: usado em débitos e preços, que nunca podem ficar mais baratos."""
    return Decimal(str(value)).to_integral_value(rounding=ROUND_CEILING).quantize(_TWO_PLACES)


def is_whole_coins(value) -> bool:
    """Indica se o valor é finito e não tem parte fracionária."""
    number = Decimal(str(value))
    return number.is_finite() and number == number.to_integral_value()


def require_whole_coins(value) -> Decimal:
    """Devolve o valor como ``Decimal`` ou recusa a entrada com parte fracionária."""
    if not is_whole_coins(value):
        raise ValidationDomainError("Informe um número inteiro de moedas.")
    return Decimal(str(value))
