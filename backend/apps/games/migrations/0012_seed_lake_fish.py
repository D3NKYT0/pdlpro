from django.db import migrations

NEW_FISH = (
    ("Tilápia", "common", 1, 36, 8, 0, 1835, 600),
    ("Traíra", "common", 1, 28, 10, 0, 2509, 400),
    ("Tucunaré", "rare", 1, 14, 22, 1, 1463, 400),
    ("Tambaqui", "rare", 2, 12, 24, 1, 1061, 40),
    ("Surubim", "epic", 2, 6, 42, 0, 57, 200_000),
    ("Koi Etéreo", "legendary", 3, 3, 90, 4, 3470, 1),
    ("Boiúna", "divine", 4, 2, 130, 6, 4037, 5),
    ("Serafim de Eva", "divine", 5, 1, 180, 10, 6577, 1),
)


def seed_fish(apps, schema_editor):
    Fish = apps.get_model("games", "Fish")
    for name, rarity, rod, weight, xp, fichas, item_id, quantity in NEW_FISH:
        Fish.objects.get_or_create(
            name=name,
            defaults={
                "rarity": rarity,
                "min_rod_level": rod,
                "weight": weight,
                "xp_reward": xp,
                "fichas_reward": fichas,
                "item_id": item_id,
                "quantity": quantity,
                "active": True,
            },
        )


def unseed_fish(apps, schema_editor):
    Fish = apps.get_model("games", "Fish")
    Fish.objects.filter(name__in=[row[0] for row in NEW_FISH]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("games", "0011_prize_quantity_low_rate"),
    ]

    operations = [
        migrations.RunPython(seed_fish, unseed_fish),
    ]
