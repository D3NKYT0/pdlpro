from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("content", "0027_move_notifications_to_topbar"),
    ]

    operations = [
        migrations.AddField(
            model_name="calendarevent",
            name="description_en",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="calendarevent",
            name="description_es",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="calendarevent",
            name="title_en",
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name="calendarevent",
            name="title_es",
            field=models.CharField(blank=True, max_length=200),
        ),
    ]
