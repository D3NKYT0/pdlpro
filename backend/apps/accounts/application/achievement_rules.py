from __future__ import annotations

from collections.abc import Callable

from apps.accounts.infrastructure.achievement_facts import DjangoAchievementFacts

Rule = Callable[[object], bool]


def build_achievement_rules(
    facts: DjangoAchievementFacts | None = None,
) -> dict[str, Rule]:
    """Monta predicados de conquista sem importar modelos de outros apps.

    As consultas ORM ficam em ``DjangoAchievementFacts`` (interim CA).
    """

    facts = facts or DjangoAchievementFacts()

    return {
        "primeiro_login": lambda user: True,
        "avatar_editado": lambda user: facts.has_avatar(user),
        "email_verificado": lambda user: facts.email_verified(user),
        "2fa_ativado": lambda user: facts.twofa_enabled(user),
        "primeira_compra": lambda user: facts.shop_purchase_count(user) >= 1,
        "comprador_frequente": lambda user: facts.shop_purchase_count(user) >= 5,
        "comprador_vip": lambda user: facts.shop_purchase_count(user) >= 15,
        "primeiro_lance": lambda user: facts.bid_count(user) >= 1,
        "50_lances": lambda user: facts.bid_count(user) >= 50,
        "lanceador_profissional": lambda user: facts.bid_count(user) >= 100,
        "lanceador_mestre": lambda user: facts.bid_count(user) >= 200,
        "10_leiloes": lambda user: facts.auction_seller_count(user) >= 10,
        "leiloeiro_profissional": lambda user: facts.auction_seller_count(user) >= 25,
        "leiloeiro_mestre": lambda user: facts.auction_seller_count(user) >= 50,
        "primeiro_vencedor_leilao": lambda user: facts.auction_won_count(user) >= 1,
        "vencedor_serie": lambda user: facts.auction_won_count(user) >= 3,
        "vencedor_mestre": lambda user: facts.auction_won_count(user) >= 10,
        "primeiro_pedido_pagamento": lambda user: facts.payment_order_count(user) >= 1,
        "primeiro_pagamento_concluido": lambda user: facts.payment_order_count(
            user, confirmed_only=True
        )
        >= 1,
        "patrocinador_ouro": lambda user: facts.payment_order_count(user, confirmed_only=True)
        >= 5,
        "patrocinador_diamante": lambda user: facts.payment_order_count(
            user, confirmed_only=True
        )
        >= 10,
        "primeira_transferencia_para_jogador": lambda user: facts.player_transfer_count(user)
        >= 1,
        "benfeitor_comunitario": lambda user: facts.player_transfer_count(user) >= 10,
        "100_transacoes": lambda user: facts.wallet_transaction_count(user) >= 100,
        "250_transacoes": lambda user: facts.wallet_transaction_count(user) >= 250,
        "500_transacoes": lambda user: facts.wallet_transaction_count(user) >= 500,
        "primeiro_bonus": lambda user: facts.bonus_credit_count(user) >= 1,
        "bonus_mestre": lambda user: facts.bonus_credit_count(user) >= 10,
        "bonus_expert": lambda user: facts.bonus_credit_count(user) >= 25,
        "primeira_retirada_item": lambda user: facts.inventory_log_count(
            user, "RETIROU_DO_JOGO"
        )
        >= 1,
        "primeira_insercao_item": lambda user: facts.inventory_log_count(
            user, "INSERIU_NO_JOGO"
        )
        >= 1,
        "primeira_troca_itens": lambda user: facts.inventory_log_count(
            user, "TROCA_ENTRE_PERSONAGENS"
        )
        >= 1,
        "colecionador_itens": lambda user: facts.inventory_item_count(user) >= 10,
        "mestre_inventario": lambda user: facts.inventory_item_count(user) >= 50,
        "trocador_incansavel": lambda user: facts.inventory_log_count(
            user, "TROCA_ENTRE_PERSONAGENS"
        )
        >= 10,
        "nivel_10": lambda user: facts.level(user) >= 10,
        "nivel_25": lambda user: facts.level(user) >= 25,
        "nivel_50": lambda user: facts.level(user) >= 50,
        "nivel_75": lambda user: facts.level(user) >= 75,
        "nivel_100": lambda user: facts.level(user) >= 100,
        "1000_xp": lambda user: facts.total_xp(user) >= 1000,
        "5000_xp": lambda user: facts.total_xp(user) >= 5000,
        "10000_xp": lambda user: facts.total_xp(user) >= 10000,
        "primeiro_spin": lambda user: facts.spin_count(user) >= 1,
        "10_spins": lambda user: facts.spin_count(user) >= 10,
        "50_spins": lambda user: facts.spin_count(user) >= 50,
        "100_spins": lambda user: facts.spin_count(user) >= 100,
        "primeiro_premio_roleta": lambda user: facts.spin_count(user, with_prize=True) >= 1,
        "primeira_caixa_aberta": lambda user: facts.opened_box_count(user) >= 1,
        "10_caixas_abertas": lambda user: facts.opened_box_count(user) >= 10,
        "50_caixas_abertas": lambda user: facts.opened_box_count(user) >= 50,
        "100_caixas_abertas": lambda user: facts.opened_box_count(user) >= 100,
        "item_epico_caixa": lambda user: facts.opened_box_slot_rarity_exists(
            user, "epic", "epico"
        ),
        "item_lendario_caixa": lambda user: facts.opened_box_slot_rarity_exists(
            user, "legendary", "lendario"
        ),
        "primeira_jogada_slot": lambda user: facts.slot_play_count(user) >= 1,
        "10_jogadas_slot": lambda user: facts.slot_play_count(user) >= 10,
        "50_jogadas_slot": lambda user: facts.slot_play_count(user) >= 50,
        "100_jogadas_slot": lambda user: facts.slot_play_count(user) >= 100,
        "primeiro_jackpot": lambda user: facts.jackpot_count(user) >= 1,
        "jackpot_mestre": lambda user: facts.jackpot_count(user) >= 3,
        "primeira_jogada_dice": lambda user: facts.dice_play_count(user) >= 1,
        "10_jogadas_dice": lambda user: facts.dice_play_count(user) >= 10,
        "50_jogadas_dice": lambda user: facts.dice_play_count(user) >= 50,
        "primeira_vitoria_dice": lambda user: facts.dice_play_count(user, won_only=True) >= 1,
        "10_vitorias_dice": lambda user: facts.dice_play_count(user, won_only=True) >= 10,
        "50_vitorias_dice": lambda user: facts.dice_play_count(user, won_only=True) >= 50,
        "primeira_pescaria": lambda user: facts.fishing_catch_count(user) >= 1,
        "10_peixes_capturados": lambda user: facts.fishing_catch_count(user) >= 10,
        "50_peixes_capturados": lambda user: facts.fishing_catch_count(user) >= 50,
        "100_peixes_capturados": lambda user: facts.fishing_catch_count(user) >= 100,
        "peixe_raro": lambda user: facts.fishing_catch_count(user, rarity="rare") >= 1,
        "peixe_epico": lambda user: facts.fishing_catch_count(user, rarity="epic") >= 1,
        "peixe_lendario": lambda user: facts.fishing_catch_count(user, rarity="legendary")
        >= 1,
        "vara_nivel_5": lambda user: facts.fishing_rod_level_at_least(user, 5),
        "vara_nivel_10": lambda user: facts.fishing_rod_level_at_least(user, 10),
        "vara_nivel_20": lambda user: facts.fishing_rod_level_at_least(user, 20),
        "primeiro_battle_pass": lambda user: facts.battle_pass_progress_exists(user),
        "battle_pass_nivel_10": lambda user: facts.battle_pass_highest_level(user) >= 10,
        "battle_pass_nivel_25": lambda user: facts.battle_pass_highest_level(user) >= 25,
        "battle_pass_nivel_50": lambda user: facts.battle_pass_highest_level(user) >= 50,
        "battle_pass_premium": lambda user: facts.battle_pass_progress_exists(
            user, premium_only=True
        ),
        "primeiro_daily_bonus": lambda user: facts.daily_bonus_claim_count(user) >= 1,
        "daily_bonus_7dias": lambda user: facts.daily_bonus_claim_count(user) >= 7,
        "daily_bonus_30dias": lambda user: facts.daily_bonus_claim_count(user) >= 30,
        "daily_bonus_100dias": lambda user: facts.daily_bonus_claim_count(user) >= 100,
        "primeira_transacao_marketplace": lambda user: facts.marketplace_deal_count(user) >= 1,
        "5_transacoes_marketplace": lambda user: facts.marketplace_deal_count(user) >= 5,
        "10_transacoes_marketplace": lambda user: facts.marketplace_deal_count(user) >= 10,
        "primeira_transferencia_personagem": lambda user: facts.marketplace_deal_count(user)
        >= 1,
        "primeira_bag": lambda user: facts.bag_exists(user),
    }
