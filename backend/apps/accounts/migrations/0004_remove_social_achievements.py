from django.db import migrations


def remove_social_achievements(apps, schema_editor):
    Achievement = apps.get_model("accounts", "Achievement")
    RewardDefinition = apps.get_model("accounts", "RewardDefinition")
    UserAchievement = apps.get_model("accounts", "UserAchievement")
    codes = ["first_post", "first_friend"]
    UserAchievement.objects.filter(achievement__code__in=codes).delete()
    RewardDefinition.objects.filter(kind="achievement", reference="first_post").delete()
    Achievement.objects.filter(code__in=codes).delete()


def noop(apps, schema_editor):
    return None


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0003_seed_achievements"),
    ]

    operations = [
        migrations.RunPython(remove_social_achievements, noop),
    ]
