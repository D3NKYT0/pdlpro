from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("communication", "0004_pushsubscription"),
    ]

    operations = [
        migrations.DeleteModel(name="ChatMessage"),
        migrations.DeleteModel(name="Chat"),
        migrations.DeleteModel(name="Friendship"),
    ]
