"""Backends S3/R2 (django-storages) usados quando ``USE_S3`` está ativo."""

from __future__ import annotations

from django.conf import settings
from storages.backends.s3boto3 import S3Boto3Storage


class MediaStorage(S3Boto3Storage):
    """Mídia pública/privada no bucket (Cloudflare R2 ou S3-compatível)."""

    default_acl = None
    file_overwrite = False

    @property
    def location(self):
        return str(getattr(settings, "AWS_LOCATION", "media") or "media")
