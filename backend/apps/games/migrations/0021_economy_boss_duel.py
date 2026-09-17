import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("games", "0020_arena_boss"),
    ]

    operations = [
        migrations.CreateModel(
            name="EconomyBossDuel",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        help_text="Identificador público. Sempre UUID v4.",
                        unique=True,
                    ),
                ),
                (
                    "seq_id",
                    models.BigAutoField(
                        editable=False,
                        help_text="ID sequencial interno. Nunca expor via API.",
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("player_hp", models.PositiveIntegerField(default=0)),
                ("player_max_hp", models.PositiveIntegerField(default=0)),
                ("boss_hp", models.PositiveIntegerField(default=0)),
                ("boss_max_hp", models.PositiveIntegerField(default=0)),
                ("round", models.PositiveIntegerField(default=0)),
                ("player_crits", models.PositiveIntegerField(default=0)),
                ("boss_crits", models.PositiveIntegerField(default=0)),
                ("player_damage", models.PositiveIntegerField(default=0)),
                ("boss_damage", models.PositiveIntegerField(default=0)),
                (
                    "monster",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="boss_duels",
                        to="games.monster",
                    ),
                ),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="economy_boss_duel",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Duelo do chefe",
                "verbose_name_plural": "Duelos do chefe",
                "ordering": ["-created_at"],
            },
        ),
    ]
