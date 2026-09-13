from django.db import migrations

from apps.games.domain.arena_roster import ARENA_MONSTERS

NEW_NAMES = ("Wolf", "Lizardman", "Werewolf", "Ogre", "Death Knight")


def seed_monsters(apps, schema_editor):
    Monster = apps.get_model("games", "Monster")
    for name, level, weapon, fragments, hp, attack, defense, respawn in ARENA_MONSTERS:
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
                "active": True,
            },
        )
        if created:
            continue
        fields = []
        values = {
            "level": level,
            "required_weapon_level": weapon,
            "fragment_reward": fragments,
            "hp": hp,
            "attack": attack,
            "defense": defense,
            "respawn_seconds": respawn,
            "active": True,
        }
        for field, value in values.items():
            if getattr(monster, field) != value:
                setattr(monster, field, value)
                fields.append(field)
        if fields:
            monster.save(update_fields=fields)


def unseed_monsters(apps, schema_editor):
    Monster = apps.get_model("games", "Monster")
    Monster.objects.filter(name__in=NEW_NAMES).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("games", "0016_fishing_content_i18n"),
    ]

    operations = [
        migrations.RunPython(seed_monsters, unseed_monsters),
    ]
