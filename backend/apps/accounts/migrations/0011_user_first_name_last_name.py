# Generated for first_name and last_name on User model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0010_encrypt_totp_and_recovery_codes"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="first_name",
            field=models.CharField(blank=True, default="", max_length=60, verbose_name="Nome"),
        ),
        migrations.AddField(
            model_name="user",
            name="last_name",
            field=models.CharField(blank=True, default="", max_length=60, verbose_name="Sobrenome"),
        ),
    ]
