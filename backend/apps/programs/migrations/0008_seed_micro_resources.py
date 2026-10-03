from django.db import migrations


CATALOG = [
    ("accounts-link", "Vincular conta existente", "Conta", "Vinculação por login e senha ou e-mail."),
    ("accounts-create-character", "Criar personagem", "Conta", "Criação de personagens pelo painel."),
    ("progress-achievements", "Conquistas", "Conta", "Exibição das conquistas da conta no painel e no perfil."),
]


def forwards(apps, schema_editor):
    resource = apps.get_model("programs", "SystemResource")
    for code, name, category, description in CATALOG:
        resource.objects.get_or_create(
            code=code,
            defaults={"name": name, "category": category, "description": description, "enabled": True},
        )


def backwards(apps, schema_editor):
    apps.get_model("programs", "SystemResource").objects.filter(
        code__in=[row[0] for row in CATALOG]
    ).delete()


class Migration(migrations.Migration):
    dependencies = [("programs", "0007_update_resource_labels")]
    operations = [migrations.RunPython(forwards, backwards)]
