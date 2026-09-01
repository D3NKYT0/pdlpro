import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models
import uuid


class Migration(migrations.Migration):
    dependencies = [("accounts", "0004_remove_social_achievements")]

    operations = [
        migrations.CreateModel(
            name="WebAuthnCredential",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, help_text="Identificador público. Sempre UUID v4.", unique=True)),
                ("seq_id", models.BigAutoField(editable=False, help_text="ID sequencial interno. Nunca expor via API.", primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("credential_id", models.BinaryField(unique=True)),
                ("public_key", models.BinaryField()),
                ("sign_count", models.PositiveBigIntegerField(default=0)),
                ("transports", models.JSONField(blank=True, default=list)),
                ("aaguid", models.CharField(blank=True, default="", max_length=36)),
                ("nickname", models.CharField(blank=True, default="", max_length=64)),
                ("last_used_at", models.DateTimeField(blank=True, null=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="webauthn_credentials", to=settings.AUTH_USER_MODEL)),
            ],
            options={"verbose_name": "Chave de acesso", "verbose_name_plural": "Chaves de acesso", "ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="webauthncredential",
            index=models.Index(fields=["user", "created_at"], name="pdl_webauthn_user_created"),
        ),
    ]
