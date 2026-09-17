from django.db import migrations


def seed(apps, schema_editor):
    Resource = apps.get_model("programs", "SystemResource")
    rows = [
        ("hunt", "Caça do dia", "Jogos"),
        ("game-stores", "Lojas do jogo", "Conteúdo"),
    ]
    for code, name, category in rows:
        Resource.objects.get_or_create(
            code=code,
            defaults={
                "name": name,
                "category": category,
                "description": f"Disponibilidade de {name.lower()} para os jogadores.",
            },
        )


class Migration(migrations.Migration):
    dependencies = [("programs", "0005_alter_commission_options_and_more")]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
