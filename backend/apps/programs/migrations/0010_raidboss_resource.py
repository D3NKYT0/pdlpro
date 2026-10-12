from django.db import migrations


def forwards(apps, schema_editor):
    apps.get_model("programs", "SystemResource").objects.get_or_create(
        code="rankings-raidboss",
        defaults={"name": "Raid Bosses", "category": "Conteúdo", "enabled": True},
    )


def backwards(apps, schema_editor):
    apps.get_model("programs", "SystemResource").objects.filter(code="rankings-raidboss").delete()


class Migration(migrations.Migration):
    dependencies = [("programs", "0009_expand_micro_resources")]
    operations = [migrations.RunPython(forwards, backwards)]
