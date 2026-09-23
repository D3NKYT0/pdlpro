from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("server", "0010_indexconfig_site_metadata"),
    ]

    operations = [
        migrations.AddField(
            model_name="indexconfig",
            name="coming_soon_show_info",
            field=models.BooleanField(
                default=False,
                help_text="Permite rolar a página de lançamento e exibe as seções públicas de Informações.",
                verbose_name="Mostrar informações na Coming Soon",
            ),
        ),
    ]
