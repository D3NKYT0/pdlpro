from django.db import migrations, models


def seed_fishing_translations(apps, schema_editor):
    from apps.games.domain.fishing_i18n import BAIT_CONTENT_I18N, FISH_CONTENT_I18N

    FishingBait = apps.get_model("games", "FishingBait")
    Fish = apps.get_model("games", "Fish")
    for name, texts in BAIT_CONTENT_I18N.items():
        bait = FishingBait.objects.filter(name=name).first()
        if bait is None:
            continue
        fields = []
        for field, value in texts.items():
            if not (getattr(bait, field, "") or "").strip():
                setattr(bait, field, value)
                fields.append(field)
        if fields:
            bait.save(update_fields=fields)
    for name, texts in FISH_CONTENT_I18N.items():
        fish = Fish.objects.filter(name=name).first()
        if fish is None:
            continue
        fields = []
        for field, value in texts.items():
            if not (getattr(fish, field, "") or "").strip():
                setattr(fish, field, value)
                fields.append(field)
        if fields:
            fish.save(update_fields=fields)


class Migration(migrations.Migration):
    dependencies = [
        ("games", "0015_fishing_enchanted_baits"),
    ]

    operations = [
        migrations.AddField(
            model_name="fish",
            name="name_en",
            field=models.CharField(blank=True, max_length=80, verbose_name="Nome (EN)"),
        ),
        migrations.AddField(
            model_name="fish",
            name="name_es",
            field=models.CharField(blank=True, max_length=80, verbose_name="Nome (ES)"),
        ),
        migrations.AddField(
            model_name="fishingbait",
            name="name_en",
            field=models.CharField(blank=True, max_length=100, verbose_name="Nome (EN)"),
        ),
        migrations.AddField(
            model_name="fishingbait",
            name="name_es",
            field=models.CharField(blank=True, max_length=100, verbose_name="Nome (ES)"),
        ),
        migrations.AddField(
            model_name="fishingbait",
            name="description_en",
            field=models.CharField(blank=True, max_length=250, verbose_name="Descrição (EN)"),
        ),
        migrations.AddField(
            model_name="fishingbait",
            name="description_es",
            field=models.CharField(blank=True, max_length=250, verbose_name="Descrição (ES)"),
        ),
        migrations.RunPython(seed_fishing_translations, migrations.RunPython.noop),
    ]
