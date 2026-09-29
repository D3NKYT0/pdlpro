# Generated for PDL PRO

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("staff", "0006_integration_extra_blobs"),
    ]

    operations = [
        migrations.AddField(
            model_name="integrationsettings",
            name="analytics_blob",
            field=models.TextField(blank=True, default=""),
        ),
    ]
