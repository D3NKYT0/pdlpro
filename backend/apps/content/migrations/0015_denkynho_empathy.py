from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("content", "0014_denkynho_profile"),
    ]

    operations = [
        migrations.AddField(
            model_name="denkynhoprofile",
            name="empathy",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Sentimento do usuário que o mascote está acompanhando; vazio quando não há empatia ativa.",
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name="denkynhoprofile",
            name="empathy_expires_at",
            field=models.DateTimeField(
                blank=True,
                help_text="Quando a empatia expira, o humor volta a ser calculado só pelas necessidades do mascote.",
                null=True,
            ),
        ),
    ]
