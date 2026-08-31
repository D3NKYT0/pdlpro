from django.db import migrations


def seed_game_configs(apps, schema_editor):
    GameConfig = apps.get_model("games", "GameConfig")
    GameConfig.objects.get_or_create(
        code="roulette",
        defaults={"name": "Roleta", "active": True, "settings": {"cost": 1, "fail_chance": 20}},
    )
    GameConfig.objects.get_or_create(
        code="daily_bonus",
        defaults={"name": "Bônus diário", "active": True, "settings": {"amount": "10.00"}},
    )


def unseed_game_configs(apps, schema_editor):
    GameConfig = apps.get_model("games", "GameConfig")
    GameConfig.objects.filter(code__in=["roulette", "daily_bonus"]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("games", "0002_prize_bag_spinhistory_bagitem_dailybonusclaim"),
    ]

    operations = [
        migrations.RunPython(seed_game_configs, unseed_game_configs),
    ]
