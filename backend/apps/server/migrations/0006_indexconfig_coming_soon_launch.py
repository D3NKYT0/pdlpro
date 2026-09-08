from typing import ClassVar

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies: ClassVar = [
        ("server", "0005_characterserviceoperation"),
    ]

    operations: ClassVar = [
        migrations.AddField(
            model_name="indexconfig",
            name="coming_soon_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="indexconfig",
            name="coming_soon_subtitle",
            field=models.CharField(blank=True, max_length=300),
        ),
        migrations.AddField(
            model_name="indexconfig",
            name="coming_soon_title",
            field=models.CharField(blank=True, default="Em breve", max_length=200),
        ),
    ]
