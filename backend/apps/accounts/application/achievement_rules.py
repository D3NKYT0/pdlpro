from __future__ import annotations

from collections.abc import Callable

from django.db.models import Q

Rule = Callable[[object], bool]


def _xp_for_level(level: int) -> int:
    return 100 + max(level - 1, 0) * 25


def _profile(user):
    return getattr(user, "gamer_profile", None)


def _total_xp(user) -> int:
    profile = _profile(user)
    if profile is None:
        return 0
    total = profile.xp
    for level in range(1, profile.level):
        total += _xp_for_level(level)
    return total


def _level(user) -> int:
    profile = _profile(user)
    return profile.level if profile is not None else 1


def _opened_boxes(user):
    from apps.games.infrastructure.models import Box

    return Box.objects.filter(user=user, slots__opened=True).distinct()


def _jackpots(user) -> int:
    from apps.games.infrastructure.models import SlotHistory

    return sum(
        1
        for row in SlotHistory.objects.filter(user=user).only("reels")
        if isinstance(row.reels, list) and len(row.reels) == 3 and len(set(row.reels)) == 1
    )


def _battle_pass_level(user) -> int:
    from apps.games.infrastructure.models import BattlePassLevel, UserBattlePassProgress

    highest = 0
    for progress in UserBattlePassProgress.objects.filter(user=user):
        row = (
            BattlePassLevel.objects.filter(season=progress.season, required_xp__lte=progress.xp)
            .order_by("-level")
            .first()
        )
        if row is not None:
            highest = max(highest, row.level)
    return highest


def _player_transfers(user):
    from apps.wallet.infrastructure.models import WalletTransaction

    return WalletTransaction.objects.filter(
        wallet__user=user,
        kind=WalletTransaction.Kind.DEBIT,
        description__istartswith="Transferência para ",
    )


def _bonus_credits(user):
    from apps.wallet.infrastructure.models import WalletTransaction

    return WalletTransaction.objects.filter(wallet__user=user, kind=WalletTransaction.Kind.CREDIT, origin="bonus")


def _marketplace_deals(user):
    from apps.marketplace.infrastructure.models import CharacterListing

    return CharacterListing.objects.filter(status=CharacterListing.Status.SOLD).filter(Q(seller=user) | Q(buyer=user))


def _inventory_items(user):
    from apps.inventory.infrastructure.models import InventoryItem

    return InventoryItem.objects.filter(Q(user=user) | Q(inventory__user=user))


def _slot_rarity(value: str, *aliases: str) -> Q:
    query = Q(rarity__iexact=value)
    for alias in aliases:
        query |= Q(rarity__iexact=alias)
    return query


def build_achievement_rules() -> dict[str, Rule]:
    from apps.auction.infrastructure.models import Auction, Bid
    from apps.games.infrastructure.models import (
        Bag,
        BoxSlot,
        DailyBonusClaim,
        DiceHistory,
        FishingCatch,
        FishingRod,
        SlotHistory,
        SpinHistory,
        UserBattlePassProgress,
    )
    from apps.inventory.infrastructure.models import InventoryLog
    from apps.payment.infrastructure.models import PedidoPagamento
    from apps.shop.infrastructure.models import ShopPurchase
    from apps.wallet.infrastructure.models import WalletTransaction

    finished = Auction.Status.FINISHED
    confirmed = PedidoPagamento.Status.CONFIRMED

    return {
        "primeiro_login": lambda user: True,
        "avatar_editado": lambda user: bool(getattr(user, "avatar", None)),
        "email_verificado": lambda user: bool(getattr(user, "is_email_verified", False)),
        "2fa_ativado": lambda user: bool(getattr(user, "is_2fa_enabled", False)),
        "primeira_compra": lambda user: ShopPurchase.objects.filter(user=user).exists(),
        "comprador_frequente": lambda user: ShopPurchase.objects.filter(user=user).count() >= 5,
        "comprador_vip": lambda user: ShopPurchase.objects.filter(user=user).count() >= 15,
        "primeiro_lance": lambda user: Bid.objects.filter(bidder=user).exists(),
        "50_lances": lambda user: Bid.objects.filter(bidder=user).count() >= 50,
        "lanceador_profissional": lambda user: Bid.objects.filter(bidder=user).count() >= 100,
        "lanceador_mestre": lambda user: Bid.objects.filter(bidder=user).count() >= 200,
        "10_leiloes": lambda user: Auction.objects.filter(seller=user).count() >= 10,
        "leiloeiro_profissional": lambda user: Auction.objects.filter(seller=user).count() >= 25,
        "leiloeiro_mestre": lambda user: Auction.objects.filter(seller=user).count() >= 50,
        "primeiro_vencedor_leilao": lambda user: Auction.objects.filter(highest_bidder=user, status=finished).exists(),
        "vencedor_serie": lambda user: Auction.objects.filter(highest_bidder=user, status=finished).count() >= 3,
        "vencedor_mestre": lambda user: Auction.objects.filter(highest_bidder=user, status=finished).count() >= 10,
        "primeiro_pedido_pagamento": lambda user: PedidoPagamento.objects.filter(user=user).exists(),
        "primeiro_pagamento_concluido": lambda user: PedidoPagamento.objects.filter(user=user, status=confirmed).exists(),
        "patrocinador_ouro": lambda user: PedidoPagamento.objects.filter(user=user, status=confirmed).count() >= 5,
        "patrocinador_diamante": lambda user: PedidoPagamento.objects.filter(user=user, status=confirmed).count() >= 10,
        "primeira_transferencia_para_jogador": lambda user: _player_transfers(user).exists(),
        "benfeitor_comunitario": lambda user: _player_transfers(user).count() >= 10,
        "100_transacoes": lambda user: WalletTransaction.objects.filter(wallet__user=user).count() >= 100,
        "250_transacoes": lambda user: WalletTransaction.objects.filter(wallet__user=user).count() >= 250,
        "500_transacoes": lambda user: WalletTransaction.objects.filter(wallet__user=user).count() >= 500,
        "primeiro_bonus": lambda user: _bonus_credits(user).exists(),
        "bonus_mestre": lambda user: _bonus_credits(user).count() >= 10,
        "bonus_expert": lambda user: _bonus_credits(user).count() >= 25,
        "primeira_retirada_item": lambda user: InventoryLog.objects.filter(user=user, action="RETIROU_DO_JOGO").exists(),
        "primeira_insercao_item": lambda user: InventoryLog.objects.filter(user=user, action="INSERIU_NO_JOGO").exists(),
        "primeira_troca_itens": lambda user: InventoryLog.objects.filter(user=user, action="TROCA_ENTRE_PERSONAGENS").exists(),
        "colecionador_itens": lambda user: _inventory_items(user).count() >= 10,
        "mestre_inventario": lambda user: _inventory_items(user).count() >= 50,
        "trocador_incansavel": lambda user: InventoryLog.objects.filter(user=user, action="TROCA_ENTRE_PERSONAGENS").count() >= 10,
        "nivel_10": lambda user: _level(user) >= 10,
        "nivel_25": lambda user: _level(user) >= 25,
        "nivel_50": lambda user: _level(user) >= 50,
        "nivel_75": lambda user: _level(user) >= 75,
        "nivel_100": lambda user: _level(user) >= 100,
        "1000_xp": lambda user: _total_xp(user) >= 1000,
        "5000_xp": lambda user: _total_xp(user) >= 5000,
        "10000_xp": lambda user: _total_xp(user) >= 10000,
        "primeiro_spin": lambda user: SpinHistory.objects.filter(user=user).exists(),
        "10_spins": lambda user: SpinHistory.objects.filter(user=user).count() >= 10,
        "50_spins": lambda user: SpinHistory.objects.filter(user=user).count() >= 50,
        "100_spins": lambda user: SpinHistory.objects.filter(user=user).count() >= 100,
        "primeiro_premio_roleta": lambda user: SpinHistory.objects.filter(user=user, prize__isnull=False, failed=False).exists(),
        "primeira_caixa_aberta": lambda user: _opened_boxes(user).exists(),
        "10_caixas_abertas": lambda user: _opened_boxes(user).count() >= 10,
        "50_caixas_abertas": lambda user: _opened_boxes(user).count() >= 50,
        "100_caixas_abertas": lambda user: _opened_boxes(user).count() >= 100,
        "item_epico_caixa": lambda user: BoxSlot.objects.filter(box__user=user, opened=True).filter(_slot_rarity("epic", "epico")).exists(),
        "item_lendario_caixa": lambda user: BoxSlot.objects.filter(box__user=user, opened=True).filter(_slot_rarity("legendary", "lendario")).exists(),
        "primeira_jogada_slot": lambda user: SlotHistory.objects.filter(user=user).exists(),
        "10_jogadas_slot": lambda user: SlotHistory.objects.filter(user=user).count() >= 10,
        "50_jogadas_slot": lambda user: SlotHistory.objects.filter(user=user).count() >= 50,
        "100_jogadas_slot": lambda user: SlotHistory.objects.filter(user=user).count() >= 100,
        "primeiro_jackpot": lambda user: _jackpots(user) >= 1,
        "jackpot_mestre": lambda user: _jackpots(user) >= 3,
        "primeira_jogada_dice": lambda user: DiceHistory.objects.filter(user=user).exists(),
        "10_jogadas_dice": lambda user: DiceHistory.objects.filter(user=user).count() >= 10,
        "50_jogadas_dice": lambda user: DiceHistory.objects.filter(user=user).count() >= 50,
        "primeira_vitoria_dice": lambda user: DiceHistory.objects.filter(user=user, won=True).exists(),
        "10_vitorias_dice": lambda user: DiceHistory.objects.filter(user=user, won=True).count() >= 10,
        "50_vitorias_dice": lambda user: DiceHistory.objects.filter(user=user, won=True).count() >= 50,
        "primeira_pescaria": lambda user: FishingCatch.objects.filter(user=user, success=True).exists(),
        "10_peixes_capturados": lambda user: FishingCatch.objects.filter(user=user, success=True).count() >= 10,
        "50_peixes_capturados": lambda user: FishingCatch.objects.filter(user=user, success=True).count() >= 50,
        "100_peixes_capturados": lambda user: FishingCatch.objects.filter(user=user, success=True).count() >= 100,
        "peixe_raro": lambda user: FishingCatch.objects.filter(user=user, success=True, fish__rarity__iexact="rare").exists(),
        "peixe_epico": lambda user: FishingCatch.objects.filter(user=user, success=True, fish__rarity__iexact="epic").exists(),
        "peixe_lendario": lambda user: FishingCatch.objects.filter(user=user, success=True, fish__rarity__iexact="legendary").exists(),
        "vara_nivel_5": lambda user: FishingRod.objects.filter(user=user, level__gte=5).exists(),
        "vara_nivel_10": lambda user: FishingRod.objects.filter(user=user, level__gte=10).exists(),
        "vara_nivel_20": lambda user: FishingRod.objects.filter(user=user, level__gte=20).exists(),
        "primeiro_battle_pass": lambda user: UserBattlePassProgress.objects.filter(user=user).exists(),
        "battle_pass_nivel_10": lambda user: _battle_pass_level(user) >= 10,
        "battle_pass_nivel_25": lambda user: _battle_pass_level(user) >= 25,
        "battle_pass_nivel_50": lambda user: _battle_pass_level(user) >= 50,
        "battle_pass_premium": lambda user: UserBattlePassProgress.objects.filter(user=user, has_premium=True).exists(),
        "primeiro_daily_bonus": lambda user: DailyBonusClaim.objects.filter(user=user).exists(),
        "daily_bonus_7dias": lambda user: DailyBonusClaim.objects.filter(user=user).count() >= 7,
        "daily_bonus_30dias": lambda user: DailyBonusClaim.objects.filter(user=user).count() >= 30,
        "daily_bonus_100dias": lambda user: DailyBonusClaim.objects.filter(user=user).count() >= 100,
        "primeira_transacao_marketplace": lambda user: _marketplace_deals(user).exists(),
        "5_transacoes_marketplace": lambda user: _marketplace_deals(user).count() >= 5,
        "10_transacoes_marketplace": lambda user: _marketplace_deals(user).count() >= 10,
        "primeira_transferencia_personagem": lambda user: _marketplace_deals(user).exists(),
        "primeira_bag": lambda user: Bag.objects.filter(user=user).exists(),
    }
