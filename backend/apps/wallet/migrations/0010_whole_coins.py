from decimal import Decimal

from django.db import migrations

from apps.wallet.domain.coins import ceil_coins, floor_coins


def _round_column(Model, field, rounding, **filters):
    for pk, value in Model.objects.filter(**filters).values_list("pk", field):
        if value is not None and rounding(value) != value:
            Model.objects.filter(pk=pk).update(**{field: rounding(value)})


def round_balances_down(apps):
    """Arredonda saldos para baixo e registra a diferença, mantendo a conciliação do extrato."""
    Wallet = apps.get_model("wallet", "Wallet")
    WalletTransaction = apps.get_model("wallet", "WalletTransaction")
    for wallet in Wallet.objects.all().iterator():
        for field in ("balance", "bonus_balance"):
            value = getattr(wallet, field)
            whole = floor_coins(value)
            if whole == value:
                continue
            Wallet.objects.filter(pk=wallet.pk).update(**{field: whole})
            WalletTransaction.objects.create(
                wallet=wallet,
                kind="SAIDA",
                amount=value - whole,
                destination="coin_rounding",
                description="Arredondamento para moedas inteiras",
            )


def round_catalog(apps):
    """Preços vigentes sobem para o inteiro seguinte; quantidades a entregar descem."""
    for app, model, field, filters in (
        ("shop", "ShopItem", "price", {}),
        ("shop", "ShopPackage", "total_price", {}),
        ("server", "ServicePrice", "price", {}),
        ("games", "BoxType", "price", {}),
        ("games", "BattlePassSeason", "premium_price", {}),
        ("marketplace", "CharacterListing", "price", {"status": "for_sale"}),
        ("auction", "Auction", "min_bid", {"status": "open"}),
    ):
        _round_column(apps.get_model(app, model), field, ceil_coins, **filters)
    _round_column(apps.get_model("wallet", "CoinPackage"), "coins", floor_coins)
    _round_column(
        apps.get_model("payment", "PedidoPagamento"), "coins", floor_coins, status__in=["pending", "processing"]
    )


def make_coins_whole(apps, schema_editor):
    round_balances_down(apps)
    round_catalog(apps)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    """Histórico (extrato, compras e pedidos concluídos) permanece como foi registrado."""

    dependencies = [
        ("wallet", "0009_coinconfig_game_units_per_coin"),
        ("shop", "0003_alter_cartitem_options_alter_cartpackage_options_and_more"),
        ("server", "0017_rankingboss"),
        ("games", "0021_economy_boss_duel"),
        ("marketplace", "0004_characterlisting_bag_skills"),
        ("auction", "0005_auction_skills"),
        ("payment", "0003_coin_packages_multicurrency"),
    ]

    operations = [migrations.RunPython(make_coins_whole, reverse_code=noop)]
