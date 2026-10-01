from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

from apps.wallet.domain.repositories import IWalletRepository
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
    """Cota pacotes ou valores avulsos para moedas de cobrança habilitadas.

    Chame ``quote(package_id=..., amount=..., currency=...)``. Um pacote ativo tem prioridade
    sobre amount e pode ser localizado por UUID ou código. Sem pacote, exige amount positivo e
    usa as moedas de cobrança habilitadas no repositório. Retorna CoinQuote sem criar pagamento.
    """

    def __init__(self, wallets: IWalletRepository) -> None:
        self._wallets = wallets

    def quote(self, *, package_id: str | None, amount: Decimal | None, currency: str) -> CoinQuote:
        currency = (currency or "").strip().upper()
        if not currency:
            raise ValidationDomainError("Moeda não suportada ou desabilitada.")
        charge_currency = self._wallets.find_enabled_charge_currency(currency)
        if charge_currency is None or not charge_currency.get("enabled", True):
            raise ValidationDomainError("Moeda não suportada ou desabilitada.")
        if package_id:
            package = self._wallets.find_active_coin_package(package_id)
            if package is None:
                raise EntityNotFoundError("Pacote de moedas não encontrado.")
            prices = package.get("prices") or {}
            price = prices.get(currency)
            if price is None:
                if currency == "BRL" and package.get("price_brl"):
                    price = package["price_brl"]
                elif currency == "USD" and package.get("price_usd"):
                    price = package["price_usd"]
            if price is None or Decimal(str(price)) <= 0:
                raise ValidationDomainError("Pacote de moedas não possui preço para esta moeda.")
            return CoinQuote(
                coins=Decimal(str(package["coins"])),
                amount=Decimal(str(price)),
                currency=currency,
                package_code=package["code"],
                package_name=package["name"],
            )
        if amount is None or amount <= 0:
            raise ValidationDomainError("Informe um pacote ou um valor válido.")
        rate = Decimal(str(charge_currency["coins_per_unit"]))
        if rate <= 0:
            raise ValidationDomainError("Taxa de conversão inválida para esta moeda.")
        coins = (amount * rate).quantize(Decimal("0.01"))
        return CoinQuote(coins=coins, amount=amount, currency=currency, package_code="", package_name="")

    def amount_for_coins(self, coins: Decimal, currency: str) -> Decimal:
        """Converte moedas já cotadas no valor da moeda pedida, com a taxa ativa."""

        currency = (currency or "").strip().upper()
        if not currency:
            raise ValidationDomainError("Moeda não suportada ou desabilitada.")
        charge_currency = self._wallets.find_enabled_charge_currency(currency)
        if charge_currency is None or not charge_currency.get("enabled", True):
            raise ValidationDomainError("Moeda não suportada ou desabilitada.")
        if coins <= 0:
            raise ValidationDomainError("Informe um pacote ou um valor válido.")
        rate = Decimal(str(charge_currency["coins_per_unit"]))
        if rate <= 0:
            raise ValidationDomainError("Taxa de conversão inválida para esta moeda.")
        return (coins / rate).quantize(Decimal("0.01"))

