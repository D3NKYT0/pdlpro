from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("server", "0012_indexconfig_coming_soon_socials"),
    ]

    operations = [
        migrations.AddField(
            model_name="indexconfig",
            name="youtube_url",
            field=models.CharField(blank=True, max_length=300, verbose_name="URL do YouTube"),
        ),
    ]
