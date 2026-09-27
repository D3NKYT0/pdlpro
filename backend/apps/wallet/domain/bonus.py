from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True, slots=True)
class BonusPreview:
    """Resultado da simulação de bônus: quantidade base, percentual, bônus e total em moedas.

    É um objeto de dados; não carrega métodos de persistência do ORM. Consulte os campos tipados
    abaixo ao montar ou consumir o resultado.
    """

    amount: Decimal
    bonus: Decimal
    percent: Decimal
    description: str
    total: Decimal
    tier_bonus: Decimal = Decimal("0.00")
    promo_bonus: Decimal = Decimal("0.00")
    pix_bonus: Decimal = Decimal("0.00")
    first_purchase_bonus: Decimal = Decimal("0.00")


class IPurchaseBonusPolicy(ABC):
    """Porta de simulação do bônus para uma quantidade de moedas compradas.

    ``preview(amount)`` recebe Decimal em moedas do painel e devolve BonusPreview com bônus e
    total. Não grava extrato nem altera carteira; a aplicação valida a entrada e aplica o
    resultado ao confirmar o pagamento.
    """

    @abstractmethod
    def preview(
        self,
        amount: Decimal,
        *,
        payment_method: str = "",
        is_first_purchase: bool = False,
    ) -> BonusPreview:
        """Calcula bônus e total para amount em moedas do painel, sem efetuar crédito."""

        raise NotImplementedError
