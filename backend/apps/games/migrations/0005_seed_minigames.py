from django.db import migrations


def seed_minigames(apps, schema_editor):
    GameConfig = apps.get_model("games", "GameConfig")
    GameConfig.objects.get_or_create(
        code="dice",
        defaults={"name": "Dados", "active": True, "settings": {"min_bet": 1}},
    )
    GameConfig.objects.get_or_create(
        code="slots",
        defaults={"name": "Slots", "active": True, "settings": {"cost": 1}},
    )


def unseed_minigames(apps, schema_editor):
    GameConfig = apps.get_model("games", "GameConfig")
    GameConfig.objects.filter(code__in=["dice", "slots"]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("games", "0004_boxtype_catalogitem_box_boxslot_boxtype_items_and_more"),
    ]

    operations = [
        migrations.RunPython(seed_minigames, unseed_minigames),
    ]
