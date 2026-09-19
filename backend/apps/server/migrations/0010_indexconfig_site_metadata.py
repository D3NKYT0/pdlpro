from typing import ClassVar

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies: ClassVar = [
        ("server", "0009_character_moderation"),
    ]
    operations: ClassVar = [
        migrations.AddField(
            model_name="indexconfig",
            name="discord_url",
            field=models.CharField(blank=True, max_length=300, verbose_name="URL do Discord"),
        ),
        migrations.AddField(
            model_name="indexconfig",
            name="og_image",
            field=models.CharField(blank=True, max_length=300, verbose_name="Imagem Open Graph"),
        ),
        migrations.AddField(
            model_name="indexconfig",
            name="seo_description",
            field=models.TextField(blank=True, verbose_name="Descrição SEO"),
        ),
        migrations.AddField(
            model_name="indexconfig",
            name="seo_title",
            field=models.CharField(blank=True, max_length=200, verbose_name="Título SEO"),
        ),
        migrations.AddField(
            model_name="indexconfig",
            name="trailer_youtube_id",
            field=models.CharField(blank=True, max_length=11, verbose_name="ID do trailer no YouTube"),
        ),
    ]
