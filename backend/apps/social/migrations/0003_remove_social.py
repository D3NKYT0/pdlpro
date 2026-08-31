from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("social", "0002_progress_social_games"),
    ]

    operations = [
        migrations.DeleteModel(name="Comment"),
        migrations.DeleteModel(name="PostLike"),
        migrations.DeleteModel(name="Post"),
    ]
