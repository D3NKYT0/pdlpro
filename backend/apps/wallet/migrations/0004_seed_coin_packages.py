from decimal import Decimal

from django.db import migrations


PACKAGES = [
    ("starter", "Iniciante", "25.00", "25.00", "4.90", "", 10),
    ("plus", "Plus", "50.00", "50.00", "9.90", "Mais escolhido", 20),
    ("pro", "Pro", "120.00", "100.00", "18.90", "Melhor custo", 30),
    ("elite", "Elite", "300.00", "200.00", "36.90", "", 40),
    ("legend", "Lenda", "800.00", "500.00", "89.90", "Máximo", 50),
]


def seed_packages(apps, schema_editor):
    CoinPackage = apps.get_model("wallet", "CoinPackage")
    for code, name, coins, brl, usd, badge, order in PACKAGES:
        CoinPackage.objects.get_or_create(
            code=code,
            defaults={
                "name": name,
                "coins": Decimal(coins),
                "price_brl": Decimal(brl),
                "price_usd": Decimal(usd),
                "badge": badge,
                "sort_order": order,
                "active": True,
            },
        )


def unseed_packages(apps, schema_editor):
    CoinPackage = apps.get_model("wallet", "CoinPackage")
    CoinPackage.objects.filter(code__in=[row[0] for row in PACKAGES]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("wallet", "0003_coin_packages_multicurrency"),
    ]

    operations = [
        migrations.RunPython(seed_packages, unseed_packages),
    ]
