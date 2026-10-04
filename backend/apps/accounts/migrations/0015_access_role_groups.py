"""Disponibiliza os papéis combináveis sem promover contas existentes."""

from django.db import migrations


def create_role_groups(apps, schema_editor):
    """Cria somente grupos ausentes; preserva concessões e associações existentes."""
    group = apps.get_model("auth", "Group")
    for role in ("player", "supporter", "promoter", "partner", "support", "editor", "moderator", "staff", "admin"):
        group.objects.using(schema_editor.connection.alias).get_or_create(name=f"PDL:{role}")


class Migration(migrations.Migration):
    dependencies = [("accounts", "0014_alter_user_options_alter_user_role"), ("auth", "0012_alter_user_first_name_max_length")]
    # A reversão preserva grupos, pois podem já conter associações/concessões reais.
    operations = [migrations.RunPython(create_role_groups, migrations.RunPython.noop)]
