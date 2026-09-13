from django.db import migrations


def apply_bait_economy(apps, schema_editor):
    GameConfig = apps.get_model("games", "GameConfig")
    FishingBait = apps.get_model("games", "FishingBait")
    config = GameConfig.objects.filter(code="fishing").first()
    if config:
        settings = dict(config.settings or {})
        settings.setdefault("baits_per_token", 10)
        try:
            settings["cost_per_cast"] = max(1, int(settings.get("cost_per_cast", 1)))
        except (TypeError, ValueError):
            settings["cost_per_cast"] = 1
        config.settings = settings
        config.save(update_fields=["settings"])
    FishingBait.objects.update(price=1)


class Migration(migrations.Migration):
    dependencies = [
        ("games", "0012_seed_lake_fish"),
    ]

    operations = [
        migrations.RunPython(apply_bait_economy, migrations.RunPython.noop),
    ]
