import uuid

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("themes", "0002_themepackage_selected_template"),
    ]

    operations = [
        migrations.CreateModel(
            name="ThemeSettings",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, help_text="Identificador público. Sempre UUID v4.", unique=True)),
                ("seq_id", models.BigAutoField(editable=False, help_text="ID sequencial interno. Nunca expor via API.", primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("key", models.CharField(default="default", editable=False, max_length=16, unique=True)),
                ("default_template", models.CharField(
                    blank=True,
                    default="",
                    help_text="Layout público do PDL Classic. Vazio usa o chrome interno.",
                    max_length=40,
                    verbose_name="Template do catálogo",
                )),
            ],
            options={
                "verbose_name": "Preferência de tema",
                "verbose_name_plural": "Preferências de tema",
            },
        ),
    ]
