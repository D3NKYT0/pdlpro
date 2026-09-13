from django.db import migrations, models


def seed_bait_kinds(apps, schema_editor):
    FishingBait = apps.get_model("games", "FishingBait")
    common, _ = FishingBait.objects.get_or_create(
        name="Isca comum",
        defaults={
            "paid_with": "tokens",
            "price": 1,
            "success_bonus": 0,
            "description": "Isca simples para lançar a linha.",
            "active": True,
        },
    )
    if common.paid_with != "tokens":
        common.paid_with = "tokens"
        common.price = 1
        common.success_bonus = 0
        common.active = True
        common.save(update_fields=["paid_with", "price", "success_bonus", "active"])
    upgrades = {
        "Isca do aprendiz": (3, 5, "Uma chance extra para trazer seu próximo troféu."),
        "Isca encantada": (8, 15, "Atrai peixes raros nas águas mais profundas."),
    }
    for name, (price, bonus, description) in upgrades.items():
        bait, _ = FishingBait.objects.get_or_create(
            name=name,
            defaults={
                "paid_with": "baits",
                "price": price,
                "success_bonus": bonus,
                "description": description,
                "active": True,
            },
        )
        bait.paid_with = "baits"
        bait.price = price
        bait.success_bonus = bonus
        bait.description = description
        bait.active = True
        bait.save(
            update_fields=["paid_with", "price", "success_bonus", "description", "active"]
        )


class Migration(migrations.Migration):
    dependencies = [
        ("games", "0014_fishing_flat_bait_price"),
    ]

    operations = [
        migrations.AddField(
            model_name="fishingbait",
            name="paid_with",
            field=models.CharField(
                choices=[("tokens", "Fichas"), ("baits", "Iscas comuns")],
                default="tokens",
                help_text="Fichas compram isca comum; iscas comuns compram as encantadas.",
                max_length=10,
            ),
        ),
        migrations.AlterField(
            model_name="fishingbait",
            name="price",
            field=models.PositiveIntegerField(
                default=1,
                help_text="Custo em iscas comuns quando a isca é encantada.",
            ),
        ),
        migrations.RunPython(seed_bait_kinds, migrations.RunPython.noop),
    ]
