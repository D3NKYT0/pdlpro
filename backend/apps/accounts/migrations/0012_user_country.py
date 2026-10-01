# Generated for country on User model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0011_user_first_name_last_name"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="country",
            field=models.CharField(
                blank=True,
                default="",
                max_length=2,
                verbose_name="País (ISO 3166-1 alpha-2)",
            ),
        ),
    ]
