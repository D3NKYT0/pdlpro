from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID

from django.conf import settings

from apps.wallet.infrastructure.models import CoinConfig, CoinPackage
from common.architecture.exceptions import EntityNotFoundError, ValidationDomainError


@dataclass(frozen=True, slots=True)
class CoinQuote:
    """Cotação que separa amount na moeda indicada por currency de coins no saldo do painel.

    É um objeto de dados; não carrega métodos de persistência do ORM. Consulte os campos tipados
    abaixo ao montar ou consumir o resultado.
    """

    coins: Decimal
    amount: Decimal
    currency: str
    package_code: str
    package_name: str


class CoinPricingService:
    """Cota pacotes ou valores avulsos em BRL e USD para moedas do painel.

    Chame ``quote(package_id=..., amount=..., currency=...)``. Um pacote ativo tem prioridade
    sobre amount e pode ser localizado por UUID ou código. Sem pacote, exige amount positivo e
    usa os multiplicadores da CoinConfig ativa ou os padrões configurados. Retorna CoinQuote sem
    criar pagamento.
    """

    def quote(self, *, package_id: str | None, amount: Decimal | None, currency: str) -> CoinQuote:
        currency = currency.upper()
        if currency not in {"BRL", "USD"}:
            raise ValidationDomainError("Moeda inválida. Use BRL ou USD.")
        if package_id:
            # Códigos comerciais não passam pela conversão do UUIDField do ORM.
            try:
                package_uuid = UUID(str(package_id))
            except ValueError:
                package_uuid = None
            package = CoinPackage.objects.filter(id=package_uuid, active=True).first() if package_uuid else None
            if package is None:
                package = CoinPackage.objects.filter(code=package_id, active=True).first()
            if package is None:
                raise EntityNotFoundError("Pacote de moedas não encontrado.")
            price = package.price_brl if currency == "BRL" else package.price_usd
            return CoinQuote(
                coins=package.coins,
                amount=price,
                currency=currency,
                package_code=package.code,
                package_name=package.name,
            )
        if amount is None or amount <= 0:
            raise ValidationDomainError("Informe um pacote ou um valor válido.")
        config = CoinConfig.objects.filter(active=True).first()
        brl_rate = config.multiplier if config else Decimal("1.00")
        usd_rate = config.usd_multiplier if config else Decimal(str(getattr(settings, "COINS_PER_USD", "5.00")))
        coins = (amount * brl_rate if currency == "BRL" else amount * usd_rate).quantize(Decimal("0.01"))
        return CoinQuote(coins=coins, amount=amount, currency=currency, package_code="", package_name="")
