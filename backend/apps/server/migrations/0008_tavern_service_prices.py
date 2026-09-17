from decimal import Decimal

from django.db import migrations


def seed_tavern_prices(apps, schema_editor):
    ServicePrice = apps.get_model("server", "ServicePrice")
    rows = (
        ("TELEPORT", "Teleporte para vila", Decimal("5.00")),
        ("APPEARANCE", "Visual (cabelo e rosto)", Decimal("5.00")),
        ("CLEAR_KARMA", "Limpar karma", Decimal("15.00")),
        ("CLEAR_PK", "Limpar PK", Decimal("20.00")),
    )
    for code, name, price in rows:
        ServicePrice.objects.get_or_create(
            code=code,
            defaults={"name": name, "price": price, "active": True},
        )


class Migration(migrations.Migration):
    dependencies = [
        ("server", "0007_alter_itemobservationdetail_options_and_more"),
    ]
    operations = [migrations.RunPython(seed_tavern_prices, migrations.RunPython.noop)]
