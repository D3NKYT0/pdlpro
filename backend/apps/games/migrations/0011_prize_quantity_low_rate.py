from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("games", "0010_showcase_game_names"),
    ]

    operations = [
        migrations.AddField(
            model_name="prize",
            name="quantity",
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AddField(
            model_name="catalogitem",
            name="quantity",
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AddField(
            model_name="boxslot",
            name="quantity",
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AddField(
            model_name="fish",
            name="quantity",
            field=models.PositiveIntegerField(default=1),
        ),
    ]
