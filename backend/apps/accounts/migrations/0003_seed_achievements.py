from django.db import migrations


ACHIEVEMENTS = [
    ("first_post", "Primeira publicação", "Publique no feed."),
    ("first_friend", "Primeiro amigo", "Aceite ou faça um amigo."),
    ("daily_bonus", "Bônus diário", "Resgate o bônus diário."),
    ("first_spin", "Primeiro giro", "Gire a roleta."),
    ("first_fish", "Primeiro peixe", "Pesque com sucesso."),
]


def seed_progress(apps, schema_editor):
    Achievement = apps.get_model("accounts", "Achievement")
    RewardDefinition = apps.get_model("accounts", "RewardDefinition")
    for code, name, description in ACHIEVEMENTS:
        Achievement.objects.get_or_create(code=code, defaults={"name": name, "description": description})
    RewardDefinition.objects.get_or_create(
        kind="level",
        reference="2",
        defaults={
            "item_id": 57,
            "item_name": "Adena",
            "quantity": 100,
            "description": "Recompensa do nível 2",
        },
    )
    RewardDefinition.objects.get_or_create(
        kind="achievement",
        reference="first_post",
        defaults={
            "item_id": 57,
            "item_name": "Adena",
            "quantity": 50,
            "description": "Recompensa da primeira publicação",
        },
    )


def unseed_progress(apps, schema_editor):
    Achievement = apps.get_model("accounts", "Achievement")
    RewardDefinition = apps.get_model("accounts", "RewardDefinition")
    Achievement.objects.filter(code__in=[code for code, _, _ in ACHIEVEMENTS]).delete()
    RewardDefinition.objects.filter(kind="level", reference="2").delete()
    RewardDefinition.objects.filter(kind="achievement", reference="first_post").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_progress_social_games"),
    ]

    operations = [
        migrations.RunPython(seed_progress, unseed_progress),
    ]
