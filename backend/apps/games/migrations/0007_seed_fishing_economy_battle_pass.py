from datetime import timedelta
from decimal import Decimal

from django.db import migrations
from django.utils import timezone


def seed_games(apps, schema_editor):
    GameConfig = apps.get_model("games", "GameConfig")
    Fish = apps.get_model("games", "Fish")
    Monster = apps.get_model("games", "Monster")
    BattlePassSeason = apps.get_model("games", "BattlePassSeason")
    BattlePassLevel = apps.get_model("games", "BattlePassLevel")
    BattlePassReward = apps.get_model("games", "BattlePassReward")

    GameConfig.objects.get_or_create(
        code="fishing",
        defaults={"name": "Pesca", "active": True, "settings": {"cost_per_cast": 1}},
    )
    GameConfig.objects.get_or_create(
        code="economy",
        defaults={"name": "Economia", "active": True, "settings": {}},
    )

    Fish.objects.get_or_create(
        name="Lambari",
        defaults={"rarity": "common", "min_rod_level": 1, "weight": 40, "xp_reward": 8, "fichas_reward": 0},
    )
    Fish.objects.get_or_create(
        name="Dourado",
        defaults={
            "rarity": "rare",
            "min_rod_level": 1,
            "weight": 15,
            "xp_reward": 20,
            "fichas_reward": 1,
        },
    )
    Fish.objects.get_or_create(
        name="Piraíba",
        defaults={
            "rarity": "epic",
            "min_rod_level": 2,
            "weight": 5,
            "xp_reward": 40,
            "item_id": 57,
            "item_name": "Adena",
        },
    )

    Monster.objects.get_or_create(
        name="Goblin",
        defaults={
            "level": 1,
            "required_weapon_level": 0,
            "fragment_reward": 5,
            "hp": 20,
            "attack": 4,
            "defense": 1,
            "respawn_seconds": 15,
        },
    )
    Monster.objects.get_or_create(
        name="Orc",
        defaults={
            "level": 3,
            "required_weapon_level": 2,
            "fragment_reward": 8,
            "hp": 50,
            "attack": 10,
            "defense": 3,
            "respawn_seconds": 30,
        },
    )

    now = timezone.now()
    season, created = BattlePassSeason.objects.get_or_create(
        name="Temporada 1",
        defaults={
            "starts_at": now - timedelta(days=1),
            "ends_at": now + timedelta(days=90),
            "active": True,
            "premium_price": Decimal("50.00"),
        },
    )
    if created:
        free_one = BattlePassLevel.objects.create(season=season, level=1, required_xp=0)
        two = BattlePassLevel.objects.create(season=season, level=2, required_xp=20)
        three = BattlePassLevel.objects.create(season=season, level=3, required_xp=50)
        BattlePassReward.objects.create(
            level_row=free_one, is_premium=False, item_id=57, item_name="Adena", quantity=50, description="Livre Nv.1"
        )
        BattlePassReward.objects.create(
            level_row=free_one, is_premium=True, item_id=57, item_name="Adena", quantity=200, description="Premium Nv.1"
        )
        BattlePassReward.objects.create(
            level_row=two, is_premium=False, item_id=57, item_name="Adena", quantity=100, description="Livre Nv.2"
        )
        BattlePassReward.objects.create(
            level_row=three, is_premium=True, item_id=57, item_name="Adena", quantity=500, description="Premium Nv.3"
        )


def unseed_games(apps, schema_editor):
    GameConfig = apps.get_model("games", "GameConfig")
    Fish = apps.get_model("games", "Fish")
    Monster = apps.get_model("games", "Monster")
    BattlePassSeason = apps.get_model("games", "BattlePassSeason")
    GameConfig.objects.filter(code__in=["fishing", "economy"]).delete()
    Fish.objects.filter(name__in=["Lambari", "Dourado", "Piraíba"]).delete()
    Monster.objects.filter(name__in=["Goblin", "Orc"]).delete()
    BattlePassSeason.objects.filter(name="Temporada 1").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("games", "0006_progress_social_games"),
    ]

    operations = [
        migrations.RunPython(seed_games, unseed_games),
    ]
