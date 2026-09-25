"""Monta STORAGES / MEDIA_URL a partir das settings AWS_* (R2 ou S3)."""

from __future__ import annotations

from typing import Any

from botocore.config import Config as BotoConfig


def _filesystem_storages() -> dict[str, Any]:
    return {
        "default": {
            "BACKEND": "django.core.files.storage.FileSystemStorage",
        },
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    }


def build_s3_runtime_settings(source: Any) -> dict[str, Any]:
    """Deriva flags boto3 / STORAGES / MEDIA_URL a partir de um objeto settings-like."""

    use_s3 = bool(getattr(source, "USE_S3", False))
    if not use_s3:
        return {
            "USE_S3": False,
            "STORAGES": _filesystem_storages(),
            "MEDIA_URL": getattr(source, "_BOOT_MEDIA_URL", None)
            or getattr(source, "MEDIA_URL", "/media/"),
            "AWS_QUERYSTRING_AUTH": False,
            "AWS_S3_CLIENT_CONFIG": None,
            "AWS_DEFAULT_ACL": None,
            "AWS_S3_FILE_OVERWRITE": False,
            "AWS_S3_SIGNATURE_VERSION": "s3v4",
            "AWS_S3_ADDRESSING_STYLE": "path",
        }

    bucket = str(getattr(source, "AWS_STORAGE_BUCKET_NAME", "") or "").strip()
    custom_domain = str(getattr(source, "AWS_S3_CUSTOM_DOMAIN", "") or "").strip() or None
    if not custom_domain and bucket:
        custom_domain = f"{bucket}.s3.amazonaws.com"

    private = bool(getattr(source, "AWS_S3_PRIVATE_MEDIA", False))
    querystring_auth = private
    location = str(getattr(source, "AWS_LOCATION", "media") or "media").strip() or "media"
    endpoint = str(getattr(source, "AWS_S3_ENDPOINT_URL", "") or "").strip() or None

    media_url = f"https://{custom_domain}/{location}/" if custom_domain else "/media/"

    return {
        "USE_S3": True,
        "AWS_DEFAULT_ACL": None,
        "AWS_S3_FILE_OVERWRITE": False,
        "AWS_S3_SIGNATURE_VERSION": "s3v4",
        "AWS_S3_ADDRESSING_STYLE": "path",
        "AWS_QUERYSTRING_AUTH": querystring_auth,
        "AWS_QUERYSTRING_EXPIRE": int(getattr(source, "AWS_QUERYSTRING_EXPIRE", 3600) or 3600),
        "AWS_S3_CLIENT_CONFIG": BotoConfig(
            request_checksum_calculation="when_required",
            response_checksum_validation="when_required",
        ),
        "AWS_S3_CUSTOM_DOMAIN": custom_domain,
        "AWS_S3_ENDPOINT_URL": endpoint,
        "AWS_LOCATION": location,
        "MEDIA_URL": media_url,
        "STORAGES": {
            "default": {"BACKEND": "common.storage_s3.MediaStorage"},
            "staticfiles": {
                "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
            },
        },
    }


def apply_media_storage(settings_module: Any) -> None:
    """Aplica STORAGES/MEDIA_URL e limpa o cache do storage handler do Django."""

    if not hasattr(settings_module, "_BOOT_MEDIA_URL"):
        settings_module._BOOT_MEDIA_URL = str(getattr(settings_module, "MEDIA_URL", "/media/"))

    runtime = build_s3_runtime_settings(settings_module)
    for key, value in runtime.items():
        setattr(settings_module, key, value)

    try:
        from django.core.files.storage import storages

        storages._storages.clear()
    except Exception:  # noqa: BLE001, S110
        pass
