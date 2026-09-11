from django.db import migrations

SHOWCASE_NAMES = {
    "roulette": "Roda da Fortuna",
    "daily_bonus": "Bônus diário",
    "dice": "Mesa da Taverna",
    "slots": "Cilindros",
    "fishing": "Pescaria",
    "economy": "Arena das Feras",
}

LEGACY_NAMES = {
    "roulette": ("Roleta",),
    "dice": ("Dados", "Dados da Taverna"),
    "slots": ("Slots",),
    "fishing": ("Pesca",),
    "economy": ("Economia",),
}


def rename_showcase_games(apps, schema_editor):
    GameConfig = apps.get_model("games", "GameConfig")
    for code, name in SHOWCASE_NAMES.items():
        outdated = LEGACY_NAMES.get(code)
        if outdated:
            GameConfig.objects.filter(code=code, name__in=outdated).update(name=name)


def noop(apps, schema_editor):
    return None


class Migration(migrations.Migration):
    dependencies = [
        ("games", "0009_alter_battlepassexchange_options_and_more"),
    ]

    operations = [
        migrations.RunPython(rename_showcase_games, noop),
    ]
