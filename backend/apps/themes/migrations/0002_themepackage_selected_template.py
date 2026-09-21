from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("themes", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="themepackage",
            name="selected_template",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Layout público escolhido depois da instalação. Vazio usa o renderer do ZIP.",
                max_length=40,
                verbose_name="Template do catálogo",
            ),
        ),
    ]
