from django.db import migrations, models

from apps.accounts.application.achievement_catalog import ACHIEVEMENTS

RENAMES = {
    "daily_bonus": "primeiro_daily_bonus",
    "first_spin": "primeiro_spin",
    "first_fish": "primeira_pescaria",
}


def seed_site_achievements(apps, schema_editor):
    Achievement = apps.get_model("accounts", "Achievement")
    RewardDefinition = apps.get_model("accounts", "RewardDefinition")
    for old, new in RENAMES.items():
        Achievement.objects.filter(code=old).update(code=new)
        RewardDefinition.objects.filter(kind="achievement", reference=old).update(reference=new)
    keep = {code for code, _, _ in ACHIEVEMENTS}
    for code, name, description in ACHIEVEMENTS:
        row, created = Achievement.objects.get_or_create(
            code=code,
            defaults={"name": name, "description": description},
        )
        if not created and (row.name != name or row.description != description):
            row.name = name
            row.description = description
            row.save(update_fields=["name", "description", "updated_at"])
    Achievement.objects.exclude(code__in=keep).delete()


def unseed_site_achievements(apps, schema_editor):
    Achievement = apps.get_model("accounts", "Achievement")
    RewardDefinition = apps.get_model("accounts", "RewardDefinition")
    keep = {code for code, _, _ in ACHIEVEMENTS}
    Achievement.objects.filter(code__in=keep).delete()
    for old, new in RENAMES.items():
        Achievement.objects.filter(code=new).update(code=old)
        RewardDefinition.objects.filter(kind="achievement", reference=new).update(reference=old)


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0005_webauthn_credential"),
    ]

    operations = [
        migrations.AlterField(
            model_name="achievement",
            name="code",
            field=models.CharField(max_length=50, unique=True),
        ),
        migrations.RunPython(seed_site_achievements, unseed_site_achievements),
    ]
