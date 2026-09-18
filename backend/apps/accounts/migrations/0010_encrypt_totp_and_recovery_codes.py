import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models
import uuid


def encrypt_existing_totp(apps, schema_editor):
    from common.crypto import LEGACY_TOTP_RE, field_cipher_from_settings

    User = apps.get_model("accounts", "User")
    try:
        cipher = field_cipher_from_settings()
    except Exception:
        return
    for user in User.objects.exclude(totp_secret="").iterator():
        secret = user.totp_secret or ""
        if not LEGACY_TOTP_RE.fullmatch(secret):
            continue
        user.totp_secret = cipher.seal_text(secret)
        user.save(update_fields=["totp_secret"])


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0009_private_lgpd_export_storage"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="totp_secret",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.CreateModel(
            name="TwoFactorRecoveryCode",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, help_text="Identificador público. Sempre UUID v4.", unique=True)),
                ("seq_id", models.BigAutoField(editable=False, help_text="ID sequencial interno. Nunca expor via API.", primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("code_cipher", models.TextField()),
                ("used_at", models.DateTimeField(blank=True, null=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="two_factor_recovery_codes", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "verbose_name": "Código de recuperação 2FA",
                "verbose_name_plural": "Códigos de recuperação 2FA",
            },
        ),
        migrations.AddIndex(
            model_name="twofactorrecoverycode",
            index=models.Index(fields=["user", "used_at"], name="pdl_2fa_recovery_lookup"),
        ),
        migrations.RunPython(encrypt_existing_totp, migrations.RunPython.noop),
    ]
