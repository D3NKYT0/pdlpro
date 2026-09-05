from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("content", "0017_denkynhoprofile_appearance_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="denkynhoprofile",
            name="preferred_name",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Apelido opcional da conversa; não armazena o histórico.",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="denkynhoprofile",
            name="detail",
            field=models.CharField(
                default="balanced",
                help_text="Tamanho preferido das respostas: brief, balanced ou detailed.",
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name="denkynhoprofile",
            name="last_visit_on",
            field=models.DateField(
                default=django.utils.timezone.localdate,
                help_text="Último dia em que o mascote registrou uma visita; o bônus diário não se acumula.",
            ),
        ),
        migrations.CreateModel(
            name="DenkynhoHandbook",
            fields=[],
            options={
                "verbose_name": "Passo a passo do Denkynho",
                "verbose_name_plural": "Passos a passo do Denkynho",
                "proxy": True,
                "indexes": [],
                "constraints": [],
            },
            bases=("content.faq",),
        ),
    ]
