from django.db import migrations


def forwards(apps, schema_editor):
    apps.get_model("programs", "SystemResource").objects.get_or_create(
        code="supporters-public", defaults={"name": "Apoiadores na landing e rodapé", "category": "Comunidade", "enabled": True},
    )


def backwards(apps, schema_editor):
    apps.get_model("programs", "SystemResource").objects.filter(code="supporters-public").delete()


class Migration(migrations.Migration):
    dependencies = [("programs", "0010_raidboss_resource")]
    operations = [migrations.RunPython(forwards, backwards)]
