from django.db import migrations


def flatten_bait_prices(apps, schema_editor):
    FishingBait = apps.get_model("games", "FishingBait")
    FishingBait.objects.update(price=1)


class Migration(migrations.Migration):
    dependencies = [
        ("games", "0013_fishing_bait_economy"),
    ]

    operations = [
        migrations.RunPython(flatten_bait_prices, migrations.RunPython.noop),
    ]
