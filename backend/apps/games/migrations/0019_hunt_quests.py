from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


def seed_hunt_quests(apps, schema_editor):
    HuntQuest = apps.get_model("games", "HuntQuest")
    if HuntQuest.objects.exists():
        return
    HuntQuest.objects.create(
        name="Caçada PvP",
        name_en="PvP hunt",
        name_es="Cacería PvP",
        description="Some 10 PvP neste personagem hoje.",
        description_en="Score 10 PvP on this character today.",
        description_es="Suma 10 PvP en este personaje hoy.",
        metric="pvp",
        target=10,
        period="daily",
        rewards=[{"kind": "tokens", "quantity": 5}],
        active=True,
    )
    HuntQuest.objects.create(
        name="Tempo de sessão",
        name_en="Session time",
        name_es="Tiempo de sesión",
        description="Fique 1 hora online com este personagem hoje.",
        description_en="Stay online for 1 hour on this character today.",
        description_es="Permanece 1 hora en línea con este personaje hoy.",
        metric="online_time",
        target=3600,
        period="daily",
        rewards=[
            {"kind": "item", "quantity": 10000, "item_id": 57, "enchant": 0, "name": "Adena"}
        ],
        active=True,
    )
    HuntQuest.objects.create(
        name="Subiu de nível",
        name_en="Level up",
        name_es="Subió de nivel",
        description="Ganhe 1 nível com este personagem nesta semana.",
        description_en="Gain 1 level on this character this week.",
        description_es="Gana 1 nivel con este personaje esta semana.",
        metric="level",
        target=1,
        period="weekly",
        rewards=[{"kind": "tokens", "quantity": 10}],
        active=True,
    )


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("games", "0018_alter_boxtype_boosters_amount"),
    ]

    operations = [
        migrations.CreateModel(
            name="HuntQuest",
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
                ("name", models.CharField(max_length=120)),
                ("name_en", models.CharField(blank=True, max_length=120)),
                ("name_es", models.CharField(blank=True, max_length=120)),
                ("description", models.CharField(blank=True, max_length=300)),
                ("description_en", models.CharField(blank=True, max_length=300)),
                ("description_es", models.CharField(blank=True, max_length=300)),
                (
                    "metric",
                    models.CharField(
                        choices=[
                            ("pvp", "PvP"),
                            ("pk", "PK"),
                            ("online_time", "Tempo online"),
                            ("level", "Nível"),
                        ],
                        default="pvp",
                        max_length=20,
                    ),
                ),
                ("target", models.PositiveIntegerField(default=1)),
                (
                    "period",
                    models.CharField(
                        choices=[("daily", "Diária"), ("weekly", "Semanal")],
                        default="daily",
                        max_length=10,
                    ),
                ),
                ("rewards", models.JSONField(default=list)),
                ("active", models.BooleanField(default=True)),
            ],
            options={
                "ordering": ["-created_at"],
                "verbose_name": "Missão da caça",
                "verbose_name_plural": "Missões da caça",
            },
        ),
        migrations.CreateModel(
            name="HuntSnapshot",
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
                ("login", models.CharField(max_length=45)),
                ("character_id", models.PositiveIntegerField()),
                ("period_start", models.DateField()),
                ("pvp", models.PositiveIntegerField(default=0)),
                ("pk_count", models.PositiveIntegerField(default=0)),
                ("online_time", models.PositiveIntegerField(default=0)),
                ("level", models.PositiveIntegerField(default=0)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "verbose_name": "Snapshot da caça",
                "verbose_name_plural": "Snapshots da caça",
            },
        ),
        migrations.CreateModel(
            name="HuntClaim",
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
                ("character_id", models.PositiveIntegerField()),
                ("period_start", models.DateField()),
                (
                    "quest",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        to="games.huntquest",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "verbose_name": "Resgate da caça",
                "verbose_name_plural": "Resgates da caça",
            },
        ),
        migrations.AddConstraint(
            model_name="huntsnapshot",
            constraint=models.UniqueConstraint(
                fields=("user", "character_id", "period_start"),
                name="unique_hunt_snapshot_period",
            ),
        ),
        migrations.AddConstraint(
            model_name="huntclaim",
            constraint=models.UniqueConstraint(
                fields=("user", "quest", "period_start"),
                name="unique_hunt_claim_period",
            ),
        ),
        migrations.RunPython(seed_hunt_quests, migrations.RunPython.noop),
    ]
