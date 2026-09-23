from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("server", "0013_indexconfig_youtube_url"),
    ]

    operations = [
        migrations.AddField(
            model_name="indexconfig",
            name="allow_registration",
            field=models.BooleanField(
                default=True,
                help_text="Com Coming Soon ativo, permite criar contas no site.",
                verbose_name="Permitir criar conta no site",
            ),
        ),
        migrations.AddField(
            model_name="indexconfig",
            name="allow_l2_registration",
            field=models.BooleanField(
                default=True,
                help_text="Com Coming Soon ativo, permite criar contas Lineage no painel.",
                verbose_name="Permitir criar conta L2",
            ),
        ),
    ]
