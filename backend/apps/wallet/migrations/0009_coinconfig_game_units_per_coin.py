from decimal import Decimal

from django.db import migrations, models
from django.db.models import F


def copy_multiplier_to_game_rate(apps, schema_editor):
    """Mantém a taxa que cada instalação já aplicava no câmbio: nenhuma economia muda sozinha."""
    CoinConfig = apps.get_model("wallet", "CoinConfig")
    CoinConfig.objects.update(game_units_per_coin=F("multiplier"))


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("wallet", "0008_charge_currencies_and_package_prices"),
    ]

    operations = [
        migrations.AddField(
            model_name="coinconfig",
            name="game_units_per_coin",
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal("1.00"),
                help_text="Quantidade do item entregue no jogo para cada 1 moeda de saldo do site.",
                max_digits=12,
                verbose_name="Unidades no jogo por moeda",
            ),
        ),
        migrations.RunPython(copy_multiplier_to_game_rate, reverse_code=noop),
    ]
