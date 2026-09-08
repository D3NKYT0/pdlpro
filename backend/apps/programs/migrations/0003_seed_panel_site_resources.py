from django.db import migrations


def seed(apps, schema_editor):
    Resource = apps.get_model("programs", "SystemResource")
    rows = [
        ("profile", "Meu perfil", "Conta"),
        ("accounts", "Conta L2", "Conta"),
        ("progress", "Progresso", "Conta"),
        ("notifications", "Avisos", "Comunicação"),
        ("support", "Atendimento", "Comunicação"),
        ("help", "Ajuda", "Comunicação"),
        ("news", "Notícias", "Conteúdo"),
        ("rankings", "Rankings", "Conteúdo"),
        ("wiki", "Wiki", "Conteúdo"),
        ("faq", "Perguntas frequentes", "Conteúdo"),
        ("downloads", "Downloads", "Conteúdo"),
        ("calendar", "Calendário", "Conteúdo"),
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
    dependencies = [("programs", "0002_seed_resources")]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
