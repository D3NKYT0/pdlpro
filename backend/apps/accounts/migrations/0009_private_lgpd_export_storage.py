import common.storages
from django.db import migrations, models


class Migration(migrations.Migration):
    """Move o pacote LGPD para armazenamento privado, fora da árvore servida em /media/."""

    dependencies = [
        ("accounts", "0008_lgpd_export_and_action_codes"),
    ]

    operations = [
        migrations.AlterField(
            model_name="dataexportlog",
            name="export_file",
            field=models.FileField(
                blank=True,
                storage=common.storages.PrivateFileSystemStorage(
                    directory_permissions_mode=448, file_permissions_mode=384
                ),
                upload_to="lgpd_exports/%Y/%m/",
            ),
        ),
    ]
