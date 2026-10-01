from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from django.contrib.auth import get_user_model
from django.db.models import F

from apps.wallet.application.exchange import exchange_dump
from apps.wallet.domain.entities import InsufficientBalanceError, WalletEntity
from apps.wallet.domain.repositories import (
    ICoinAdminRepository,
    IGameExchangeRepository,
    IWalletRepository,
)
from apps.wallet.infrastructure.exchange_models import GameExchange
from apps.wallet.infrastructure.models import (
    CoinConfig,
    CoinPackage,
    CoinPackagePrice,
    CoinPurchaseBonus,
    CoinPurchasePromo,
    Wallet,
    WalletChargeCurrency,
    WalletTransaction,
)

User = get_user_model()


class DjangoWalletRepository(IWalletRepository):
    """Persiste carteiras e extratos usando o ORM do Django.

    Converte modelos em WalletEntity. Atualiza saldos com expressões F e usa um débito
    condicional para impedir saldo principal ou de bônus negativo. Não valida valores
    positivos aqui; essa validação pertence ao caso de uso. Use dentro de UnitOfWork para que
    alteração do saldo e gravação do extrato revertam juntas em caso de erro. ``debit`` não
    consome saldo de bônus; ``debit_bonus`` não consome saldo principal.
    """

    def _to_entity(self, wallet: Wallet) -> WalletEntity:
        return WalletEntity(
            id=wallet.id,
            user_id=wallet.user.id,
            balance=wallet.balance,
            bonus_balance=wallet.bonus_balance,
        )

    def get_by_user_id(self, user_id: UUID) -> WalletEntity | None:
        wallet = Wallet.objects.select_related("user").filter(user__id=user_id).first()
        return self._to_entity(wallet) if wallet else None

    def get_or_create(self, user_id: UUID) -> WalletEntity:
        user = User.objects.get(id=user_id)
        wallet, _ = Wallet.objects.get_or_create(user=user)
        return self._to_entity(wallet)

    def credit(self, wallet_id: UUID, amount: Decimal, *, origin: str, description: str) -> WalletEntity:
        Wallet.objects.filter(id=wallet_id).update(balance=F("balance") + amount)
        wallet = Wallet.objects.select_related("user").get(id=wallet_id)
        WalletTransaction.objects.create(
            wallet=wallet,
            kind=WalletTransaction.Kind.CREDIT,
            amount=amount,
            origin=origin,
            description=description,
        )
        return self._to_entity(wallet)

    def credit_bonus(self, wallet_id: UUID, amount: Decimal, *, origin: str, description: str) -> WalletEntity:
        Wallet.objects.filter(id=wallet_id).update(bonus_balance=F("bonus_balance") + amount)
        wallet = Wallet.objects.select_related("user").get(id=wallet_id)
        WalletTransaction.objects.create(
            wallet=wallet,
            kind=WalletTransaction.Kind.CREDIT,
            amount=amount,
            origin=origin,
            description=description,
        )
        return self._to_entity(wallet)

    def debit(self, wallet_id: UUID, amount: Decimal, *, destination: str, description: str) -> WalletEntity:
        # A condição de saldo e o débito ficam no mesmo UPDATE para evitar uma corrida
        # entre a consulta de saldo feita pelo caso de uso e outra movimentação.
        updated = Wallet.objects.filter(id=wallet_id, balance__gte=amount).update(balance=F("balance") - amount)
        if not updated:
            raise InsufficientBalanceError()
        wallet = Wallet.objects.select_related("user").get(id=wallet_id)
        WalletTransaction.objects.create(
            wallet=wallet,
            kind=WalletTransaction.Kind.DEBIT,
            amount=amount,
            destination=destination,
            description=description,
        )
        return self._to_entity(wallet)

    def debit_bonus(
        self, wallet_id: UUID, amount: Decimal, *, destination: str, description: str
    ) -> WalletEntity:
        updated = Wallet.objects.filter(id=wallet_id, bonus_balance__gte=amount).update(
            bonus_balance=F("bonus_balance") - amount
        )
        if not updated:
            raise InsufficientBalanceError()
        wallet = Wallet.objects.select_related("user").get(id=wallet_id)
        WalletTransaction.objects.create(
            wallet=wallet,
            kind=WalletTransaction.Kind.DEBIT,
            amount=amount,
            destination=destination,
            description=description,
        )
        return self._to_entity(wallet)

    def list_transactions(self, wallet_id: UUID, *, limit: int = 50) -> list[dict]:
        rows = self.transaction_rows(wallet_id)[:limit]
        return [self.serialize_transaction(row) for row in rows]

    def transaction_rows(self, wallet_id: UUID):
        """QuerySet do extrato da carteira ordenado do mais recente ao mais antigo."""

        return WalletTransaction.objects.filter(wallet__id=wallet_id).order_by("-created_at")

    def serialize_transaction(self, row: WalletTransaction) -> dict:
        return {
            "id": str(row.id),
            "kind": row.kind,
            "amount": str(row.amount),
            "description": row.description,
            "origin": row.origin,
            "destination": row.destination,
            "created_at": row.created_at.isoformat(),
        }

    def get_active_coin_config(self) -> dict | None:
        config = CoinConfig.objects.filter(active=True).first()
        if config is None:
            return None
        return {
            "name": config.name,
            "item_id": config.coin_id,
            "multiplier": str(config.multiplier),
            "usd_multiplier": str(config.usd_multiplier),
            "withdraw_fee_percent": str(config.withdraw_fee_percent),
        }

    def _serialize_package(self, row: CoinPackage) -> dict:
        prices = {p.currency_code: p.amount for p in row.prices.all()}
        if not prices:
            if row.price_brl:
                prices["BRL"] = row.price_brl
            if row.price_usd:
                prices["USD"] = row.price_usd
        return {
            "id": str(row.id),
            "code": row.code,
            "name": row.name,
            "coins": row.coins,
            "price_brl": row.price_brl,
            "price_usd": row.price_usd,
            "prices": prices,
            "badge": row.badge,
        }

    def find_active_coin_package(self, package_id: str) -> dict | None:
        try:
            package_uuid = UUID(str(package_id))
        except ValueError:
            package_uuid = None
        row = None
        if package_uuid is not None:
            row = CoinPackage.objects.filter(id=package_uuid, active=True).first()
        if row is None:
            row = CoinPackage.objects.filter(code=package_id, active=True).first()
        return self._serialize_package(row) if row else None

    def list_active_coin_packages(self) -> list[dict]:
        return [self._serialize_package(row) for row in CoinPackage.objects.filter(active=True)]

    def get_current_purchase_promo(self) -> dict | None:
        promo = CoinPurchasePromo.current()
        if promo is None:
            return None
        return {
            "percent": str(promo.percent),
            "title": promo.title,
            "description": promo.description,
        }

    def list_game_exchanges(self, user_id: UUID, *, limit: int = 100) -> list[dict]:
        rows = GameExchange.objects.filter(user__id=user_id).order_by("-created_at")[:limit]
        return [
            dict(exchange_dump(row), login=row.login, character_id=row.character_id)
            for row in rows
        ]

    def _serialize_charge_currency(self, row: WalletChargeCurrency) -> dict:
        return {
            "code": row.code,
            "coins_per_unit": row.coins_per_unit,
            "sort_order": row.sort_order,
            "settlement": bool(row.settlement),
            "enabled": bool(row.enabled),
        }

    def list_enabled_charge_currencies(self) -> list[dict]:
        qs = WalletChargeCurrency.objects.filter(enabled=True).order_by("sort_order", "code")
        rows = list(qs)
        if not rows:
            active_config = self.get_active_coin_config()
            brl_rate = Decimal(active_config["multiplier"]) if active_config else Decimal("1.00")
            usd_rate = (
                Decimal(active_config["usd_multiplier"])
                if active_config and active_config.get("usd_multiplier") is not None
                else Decimal("5.00")
            )
            brl, _ = WalletChargeCurrency.objects.get_or_create(
                code="BRL",
                defaults={"coins_per_unit": brl_rate, "settlement": True, "enabled": True, "sort_order": 0},
            )
            usd, _ = WalletChargeCurrency.objects.get_or_create(
                code="USD",
                defaults={"coins_per_unit": usd_rate, "settlement": False, "enabled": True, "sort_order": 1},
            )
            rows = [brl, usd]
        return [self._serialize_charge_currency(r) for r in rows]

    def find_enabled_charge_currency(self, code: str) -> dict | None:
        code = (code or "").strip().upper()
        if not code:
            return None
        row = WalletChargeCurrency.objects.filter(code=code, enabled=True).first()
        if row is None and code in {"BRL", "USD"}:
            self.list_enabled_charge_currencies()
            row = WalletChargeCurrency.objects.filter(code=code, enabled=True).first()
        return self._serialize_charge_currency(row) if row else None


class DjangoCoinAdminRepository(ICoinAdminRepository):
    """Adaptador Django de ``ICoinAdminRepository`` para configuração de moeda e promoção.

    Concentra consultas e escritas ORM da porta administrativa. Prefira resolver a interface
    pelo container; o ``save`` dos modelos desativa outros registros ativos quando aplicável.
    """

    def get_coin_config(self) -> CoinConfig | None:
        return CoinConfig.objects.filter(active=True).first() or CoinConfig.objects.order_by("-updated_at").first()

    def save_coin_config(self, row: CoinConfig) -> CoinConfig:
        row.save()
        return row

    def new_coin_config(self, *, name: str = "Adena") -> CoinConfig:
        return CoinConfig(name=name)

    def get_promo(self) -> CoinPurchasePromo | None:
        return (
            CoinPurchasePromo.objects.filter(active=True).first()
            or CoinPurchasePromo.objects.order_by("-updated_at").first()
        )

    def save_promo(self, row: CoinPurchasePromo) -> CoinPurchasePromo:
        row.save()
        return row

    def new_promo(
        self,
        *,
        title: str = "Promoção de recarga",
        percent: Decimal = Decimal("10.00"),
        active: bool = False,
    ) -> CoinPurchasePromo:
        return CoinPurchasePromo(title=title, percent=percent, active=active)

    def list_coin_packages(self) -> list[CoinPackage]:
        return list(CoinPackage.objects.order_by("sort_order", "coins", "name"))

    def get_coin_package(self, package_id: str) -> CoinPackage | None:
        try:
            package_uuid = UUID(str(package_id))
        except ValueError:
            return None
        return CoinPackage.objects.filter(id=package_uuid).first()

    def find_coin_package_by_code(self, code: str) -> CoinPackage | None:
        return CoinPackage.objects.filter(code=str(code).strip()).first()

    def new_coin_package(self) -> CoinPackage:
        return CoinPackage()

    def save_coin_package(self, row: CoinPackage, *, prices: dict[str, Decimal] | None = None) -> CoinPackage:
        row.save()
        if prices is not None:
            for curr, amt in prices.items():
                curr = (curr or "").strip().upper()
                if not curr:
                    continue
                amt_dec = Decimal(str(amt))
                if amt_dec > 0:
                    CoinPackagePrice.objects.update_or_create(
                        package=row,
                        currency_code=curr,
                        defaults={"amount": amt_dec},
                    )
                elif amt_dec == 0:
                    CoinPackagePrice.objects.filter(package=row, currency_code=curr).delete()
        return row

    def delete_coin_package(self, row: CoinPackage) -> None:
        row.delete()

    def list_bonus_tiers(self) -> list[CoinPurchaseBonus]:
        return list(CoinPurchaseBonus.objects.order_by("order", "min_amount"))

    def get_bonus_tier(self, tier_id: str) -> CoinPurchaseBonus | None:
        try:
            tier_uuid = UUID(str(tier_id))
        except ValueError:
            return None
        return CoinPurchaseBonus.objects.filter(id=tier_uuid).first()

    def new_bonus_tier(self) -> CoinPurchaseBonus:
        return CoinPurchaseBonus()

    def save_bonus_tier(self, row: CoinPurchaseBonus) -> CoinPurchaseBonus:
        row.save()
        return row

    def delete_bonus_tier(self, row: CoinPurchaseBonus) -> None:
        row.delete()

    def list_charge_currencies(self) -> list[WalletChargeCurrency]:
        qs = WalletChargeCurrency.objects.order_by("sort_order", "code")
        if not qs.exists():
            WalletChargeCurrency.objects.get_or_create(
                code="BRL",
                defaults={"coins_per_unit": Decimal("1.00"), "settlement": True, "enabled": True, "sort_order": 0},
            )
            WalletChargeCurrency.objects.get_or_create(
                code="USD",
                defaults={"coins_per_unit": Decimal("5.00"), "settlement": False, "enabled": True, "sort_order": 1},
            )
            qs = WalletChargeCurrency.objects.order_by("sort_order", "code")
        return list(qs)

    def get_charge_currency(self, code: str) -> WalletChargeCurrency | None:
        return WalletChargeCurrency.objects.filter(code=(code or "").strip().upper()).first()

    def new_charge_currency(
        self,
        *,
        code: str,
        coins_per_unit: Decimal = Decimal("1.00"),
        enabled: bool = True,
        sort_order: int = 0,
        settlement: bool = False,
    ) -> WalletChargeCurrency:
        return WalletChargeCurrency(
            code=(code or "").strip().upper(),
            coins_per_unit=coins_per_unit,
            enabled=enabled,
            sort_order=sort_order,
            settlement=settlement,
        )

    def save_charge_currency(self, row: WalletChargeCurrency) -> WalletChargeCurrency:
        row.save()
        return row

    def delete_charge_currency(self, row: WalletChargeCurrency) -> None:
        row.delete()


class DjangoGameExchangeRepository(IGameExchangeRepository):
    """Adaptador Django de ``IGameExchangeRepository`` para recibos de câmbio com o jogo."""

    def lock_user(self, user_id: UUID):
        return User.objects.select_for_update().get(id=user_id)

    def find_by_request_key(self, user_id: UUID, request_key: UUID) -> GameExchange | None:
        return GameExchange.objects.filter(user__id=user_id, request_key=request_key).first()

    def has_pending(self, user_id: UUID) -> bool:
        return GameExchange.objects.filter(user__id=user_id, status="pending").exists()

    def create(self, **fields) -> GameExchange:
        return GameExchange.objects.create(**fields)

    def get_locked(self, exchange_id: UUID) -> GameExchange:
        return GameExchange.objects.select_for_update().get(pk=exchange_id)

    def save(self, row: GameExchange) -> GameExchange:
        row.save()
        return row

    def mark_connection_uncertain(self, exchange_id: UUID) -> GameExchange | None:
        # A conexão pode cair após o jogo aplicar o envio. Preserve pending
        # e retome pelo mesmo recibo, sem estornar uma operação incerta.
        GameExchange.objects.filter(pk=exchange_id, status="pending").update(
            error="Conexão não confirmada. Retome esta mesma transferência; não crie outra."
        )
        return GameExchange.objects.filter(pk=exchange_id).first()
