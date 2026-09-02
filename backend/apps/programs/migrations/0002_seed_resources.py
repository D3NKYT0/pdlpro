from django.db import migrations


def seed(apps, schema_editor):
    Resource = apps.get_model("programs", "SystemResource")
    rows = [
        ("supporters", "Apoiadores", "Comunidade"),
        ("roadmap", "Roadmap", "Conteúdo"),
        ("shop", "Loja", "Economia"),
        ("wallet", "Carteira", "Economia"),
        ("inventory", "Inventário", "Economia"),
        ("marketplace", "Marketplace", "Economia"),
        ("auction", "Leilões", "Economia"),
        ("games", "Central de jogos", "Jogos"),
        ("battle-pass", "Passe de batalha", "Jogos"),
        ("daily-bonus", "Bônus diário", "Jogos"),
        ("fishing", "Pesca", "Jogos"),
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
    dependencies = [("programs", "0001_initial")]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
