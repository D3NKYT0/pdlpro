# Generated manually for LGPD consent audit fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0006_seed_site_achievements"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="terms_accepted_ip",
            field=models.GenericIPAddressField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="user",
            name="terms_accepted_user_agent",
            field=models.CharField(blank=True, default="", max_length=500),
        ),
    ]
