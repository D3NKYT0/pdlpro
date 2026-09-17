from django.db import migrations, models

from apps.games.domain.arena_roster import ARENA_BOSS


def seed_boss(apps, schema_editor):
    Monster = apps.get_model("games", "Monster")
    name, level, weapon, fragments, hp, attack, defense, respawn = ARENA_BOSS
    monster, created = Monster.objects.get_or_create(
        name=name,
        defaults={
            "level": level,
            "required_weapon_level": weapon,
            "fragment_reward": fragments,
            "hp": hp,
            "attack": attack,
            "defense": defense,
            "respawn_seconds": respawn,
            "is_boss": True,
            "active": True,
        },
    )
    if created:
        return
    fields = []
    values = {
        "level": level,
        "required_weapon_level": weapon,
        "fragment_reward": fragments,
        "hp": hp,
        "attack": attack,
        "defense": defense,
        "respawn_seconds": respawn,
        "is_boss": True,
        "active": True,
    }
    for field, value in values.items():
        if getattr(monster, field) != value:
            setattr(monster, field, value)
            fields.append(field)
    if fields:
        monster.save(update_fields=fields)


def unseed_boss(apps, schema_editor):
    Monster = apps.get_model("games", "Monster")
    Monster.objects.filter(name=ARENA_BOSS[0]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("games", "0019_hunt_quests"),
    ]

    operations = [
        migrations.AddField(
            model_name="monster",
            name="is_boss",
            field=models.BooleanField(
                default=False,
                help_text="A vitória contra o chefe entrega o prêmio e zera a arma no máximo.",
                verbose_name="Chefe da arena",
            ),
        ),
        migrations.RunPython(seed_boss, unseed_boss),
    ]
