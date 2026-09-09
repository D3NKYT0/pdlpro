"""Consultas ORM multi-app usadas pelas regras de conquista.

Adaptador de ``IAchievementFacts``: a aplicação chama a porta; o ORM fica aqui.
"""

from __future__ import annotations

from django.db.models import Q

from apps.accounts.domain.achievement_facts import IAchievementFacts


class DjangoAchievementFacts(IAchievementFacts):
    """Encapsula contagens e existência de fatos de conquista em outros apps."""

    def _profile(self, user):
        return getattr(user, "gamer_profile", None)

    def _xp_for_level(self, level: int) -> int:
        return 100 + max(level - 1, 0) * 25

    def level(self, user) -> int:
        profile = self._profile(user)
        return profile.level if profile is not None else 1

    def total_xp(self, user) -> int:
        profile = self._profile(user)
        if profile is None:
            return 0
        total = profile.xp
        for level in range(1, profile.level):
            total += self._xp_for_level(level)
        return total

    def has_avatar(self, user) -> bool:
        return bool(getattr(user, "avatar", None))

    def email_verified(self, user) -> bool:
        return bool(getattr(user, "is_email_verified", False))

    def twofa_enabled(self, user) -> bool:
        return bool(getattr(user, "is_2fa_enabled", False))

    def shop_purchase_count(self, user) -> int:
        from apps.shop.infrastructure.models import ShopPurchase

        return ShopPurchase.objects.filter(user=user).count()

    def bid_count(self, user) -> int:
        from apps.auction.infrastructure.models import Bid

        return Bid.objects.filter(bidder=user).count()

    def auction_seller_count(self, user) -> int:
        from apps.auction.infrastructure.models import Auction

        return Auction.objects.filter(seller=user).count()

    def auction_won_count(self, user) -> int:
        from apps.auction.infrastructure.models import Auction

        return Auction.objects.filter(
            highest_bidder=user, status=Auction.Status.FINISHED
        ).count()

    def payment_order_count(self, user, *, confirmed_only: bool = False) -> int:
        from apps.payment.infrastructure.models import PedidoPagamento

        rows = PedidoPagamento.objects.filter(user=user)
        if confirmed_only:
            rows = rows.filter(status=PedidoPagamento.Status.CONFIRMED)
        return rows.count()

    def player_transfer_count(self, user) -> int:
        from apps.wallet.infrastructure.models import WalletTransaction

        return WalletTransaction.objects.filter(
            wallet__user=user,
            kind=WalletTransaction.Kind.DEBIT,
            description__istartswith="Transferência para ",
        ).count()

    def wallet_transaction_count(self, user) -> int:
        from apps.wallet.infrastructure.models import WalletTransaction

        return WalletTransaction.objects.filter(wallet__user=user).count()

    def bonus_credit_count(self, user) -> int:
        from apps.wallet.infrastructure.models import WalletTransaction

        return WalletTransaction.objects.filter(
            wallet__user=user, kind=WalletTransaction.Kind.CREDIT, origin="bonus"
        ).count()

    def inventory_log_count(self, user, action: str) -> int:
        from apps.inventory.infrastructure.models import InventoryLog

        return InventoryLog.objects.filter(user=user, action=action).count()

    def inventory_item_count(self, user) -> int:
        from apps.inventory.infrastructure.models import InventoryItem

        return InventoryItem.objects.filter(Q(user=user) | Q(inventory__user=user)).count()

    def spin_count(self, user, *, with_prize: bool = False) -> int:
        from apps.games.infrastructure.models import SpinHistory

        rows = SpinHistory.objects.filter(user=user)
        if with_prize:
            rows = rows.filter(prize__isnull=False, failed=False)
        return rows.count()

    def opened_box_count(self, user) -> int:
        from apps.games.infrastructure.models import Box

        return Box.objects.filter(user=user, slots__opened=True).distinct().count()

    def opened_box_slot_rarity_exists(self, user, value: str, *aliases: str) -> bool:
        from apps.games.infrastructure.models import BoxSlot

        query = Q(rarity__iexact=value)
        for alias in aliases:
            query |= Q(rarity__iexact=alias)
        return BoxSlot.objects.filter(box__user=user, opened=True).filter(query).exists()

    def slot_play_count(self, user) -> int:
        from apps.games.infrastructure.models import SlotHistory

        return SlotHistory.objects.filter(user=user).count()

    def jackpot_count(self, user) -> int:
        from apps.games.infrastructure.models import SlotHistory

        return sum(
            1
            for row in SlotHistory.objects.filter(user=user).only("reels")
            if isinstance(row.reels, list) and len(row.reels) == 3 and len(set(row.reels)) == 1
        )

    def dice_play_count(self, user, *, won_only: bool = False) -> int:
        from apps.games.infrastructure.models import DiceHistory

        rows = DiceHistory.objects.filter(user=user)
        if won_only:
            rows = rows.filter(won=True)
        return rows.count()

    def fishing_catch_count(self, user, *, rarity: str | None = None) -> int:
        from apps.games.infrastructure.models import FishingCatch

        rows = FishingCatch.objects.filter(user=user, success=True)
        if rarity is not None:
            rows = rows.filter(fish__rarity__iexact=rarity)
        return rows.count()

    def fishing_rod_level_at_least(self, user, level: int) -> bool:
        from apps.games.infrastructure.models import FishingRod

        return FishingRod.objects.filter(user=user, level__gte=level).exists()

    def battle_pass_progress_exists(self, user, *, premium_only: bool = False) -> bool:
        from apps.games.infrastructure.models import UserBattlePassProgress

        rows = UserBattlePassProgress.objects.filter(user=user)
        if premium_only:
            rows = rows.filter(has_premium=True)
        return rows.exists()

    def battle_pass_highest_level(self, user) -> int:
        from apps.games.infrastructure.models import (
            BattlePassLevel,
            UserBattlePassProgress,
        )

        highest = 0
        for progress in UserBattlePassProgress.objects.filter(user=user):
            row = (
                BattlePassLevel.objects.filter(
                    season=progress.season, required_xp__lte=progress.xp
                )
                .order_by("-level")
                .first()
            )
            if row is not None:
                highest = max(highest, row.level)
        return highest

    def daily_bonus_claim_count(self, user) -> int:
        from apps.games.infrastructure.models import DailyBonusClaim

        return DailyBonusClaim.objects.filter(user=user).count()

    def marketplace_deal_count(self, user) -> int:
        from apps.marketplace.infrastructure.models import CharacterListing

        return (
            CharacterListing.objects.filter(status=CharacterListing.Status.SOLD)
            .filter(Q(seller=user) | Q(buyer=user))
            .count()
        )

    def bag_exists(self, user) -> bool:
        from apps.games.infrastructure.models import Bag

        return Bag.objects.filter(user=user).exists()
