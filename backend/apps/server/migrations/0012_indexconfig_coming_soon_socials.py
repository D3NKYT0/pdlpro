from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("server", "0011_indexconfig_coming_soon_show_info"),
    ]

    operations = [
        migrations.AddField(
            model_name="indexconfig",
            name="coming_soon_show_champions",
            field=models.BooleanField(
                default=True,
                help_text="Exibe os personagens laterais na página de lançamento.",
                verbose_name="Mostrar personagens na Coming Soon",
            ),
        ),
        migrations.AddField(
            model_name="indexconfig",
            name="facebook_url",
            field=models.CharField(blank=True, max_length=300, verbose_name="URL do Facebook"),
        ),
        migrations.AddField(
            model_name="indexconfig",
            name="instagram_url",
            field=models.CharField(blank=True, max_length=300, verbose_name="URL do Instagram"),
        ),
        migrations.AddField(
            model_name="indexconfig",
            name="whatsapp_url",
            field=models.CharField(blank=True, max_length=300, verbose_name="URL do WhatsApp"),
        ),
    ]
