from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0007_user_terms_consent_audit"),
    ]

    operations = [
        migrations.CreateModel(
            name="DataExportLog",
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
                ("ip_address", models.GenericIPAddressField(blank=True, null=True)),
                ("user_agent", models.CharField(blank=True, default="", max_length=512)),
                ("export_file", models.FileField(blank=True, upload_to="lgpd_exports/%Y/%m/")),
                ("file_size_bytes", models.PositiveBigIntegerField(default=0)),
                ("expires_at", models.DateTimeField(blank=True, null=True)),
                ("downloaded_at", models.DateTimeField(blank=True, null=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="data_export_logs",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Log de exportação de dados (LGPD)",
                "verbose_name_plural": "Logs de exportação de dados (LGPD)",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="AccountActionCode",
            fields=[
                ("id", models.BigAutoField(primary_key=True, serialize=False)),
                ("code_hash", models.CharField(max_length=64)),
                (
                    "type",
                    models.CharField(
                        choices=[("lgpd_delete", "Exclusão de conta (LGPD)")],
                        max_length=32,
                    ),
                ),
                ("expires_at", models.DateTimeField()),
                ("is_used", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="action_codes",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Código de ação da conta",
                "verbose_name_plural": "Códigos de ação da conta",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="accountactioncode",
            index=models.Index(fields=["user", "type", "is_used"], name="pdl_action_code_lookup"),
        ),
        migrations.AddIndex(
            model_name="accountactioncode",
            index=models.Index(fields=["expires_at"], name="pdl_action_code_exp"),
        ),
    ]
