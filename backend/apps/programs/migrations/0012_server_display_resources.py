from django.db import migrations
from django.utils.translation import gettext_noop


RESOURCES = (
    ("server-status", gettext_noop("Status do servidor"), gettext_noop("Mostrar o status online ou offline do servidor no site e no painel.")),
    ("players-online", gettext_noop("Jogadores online"), gettext_noop("Mostrar a quantidade de jogadores online no site e no painel.")),
)


def forwards(apps, schema_editor):
    resource = apps.get_model("programs", "SystemResource")
    for code, name, description in RESOURCES:
        resource.objects.get_or_create(code=code, defaults={"name": name, "description": description, "category": "Conteúdo", "enabled": True})


def backwards(apps, schema_editor):
    apps.get_model("programs", "SystemResource").objects.filter(code__in=[row[0] for row in RESOURCES]).delete()


class Migration(migrations.Migration):
    dependencies = [("programs", "0011_public_supporters")]
    operations = [migrations.RunPython(forwards, backwards)]
