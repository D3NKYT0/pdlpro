from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("marketplace", "0002_alter_characterlisting_options_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="characterlisting",
            name="char_clan_name",
            field=models.CharField(blank=True, default="", max_length=45),
        ),
        migrations.AddField(
            model_name="characterlisting",
            name="char_is_clan_leader",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="characterlisting",
            name="char_pk",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="characterlisting",
            name="char_pvp",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="characterlisting",
            name="char_sex",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="characterlisting",
            name="char_title",
            field=models.CharField(blank=True, default="", max_length=35),
        ),
        migrations.AddField(
            model_name="characterlisting",
            name="equipment",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
