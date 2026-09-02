from django.conf import settings
from django.db import models
from django.db.models import Q

from common.models import BaseModel


class ThemePackage(BaseModel):
    """Pacote visual validado e instalado no armazenamento persistente.

    O tema ``default`` não é gravado nesta tabela: ele permanece imutável no build do
    frontend e é usado sempre que nenhum pacote está ativo. ``storage_path`` é relativo a
    ``MEDIA_ROOT/themes`` e nunca deve ser preenchido com um caminho fornecido pelo cliente.
    """

    slug = models.SlugField(max_length=64)
    name = models.CharField(max_length=120)
    version = models.CharField(max_length=32)
    author = models.CharField(max_length=120, blank=True)
    description = models.CharField(max_length=500, blank=True)
    manifest = models.JSONField(default=dict)
    content_hash = models.CharField(max_length=64, unique=True)
    storage_path = models.CharField(max_length=180, unique=True)
    entrypoint = models.CharField(max_length=180)
    is_active = models.BooleanField(default=False, db_index=True)
    installed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="installed_themes",
    )

    class Meta:
        verbose_name = "Tema"
        verbose_name_plural = "Temas"
        ordering = ["name", "-created_at"]
        constraints = [
            models.UniqueConstraint(fields=("slug", "version"), name="themes_unique_slug_version"),
            models.UniqueConstraint(
                fields=("is_active",),
                condition=Q(is_active=True),
                name="themes_single_active_package",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.name} {self.version}"

