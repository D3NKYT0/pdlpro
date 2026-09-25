from types import SimpleNamespace

from common.storage_config import apply_media_storage, build_s3_runtime_settings


def test_build_s3_runtime_settings_local():
    source = SimpleNamespace(USE_S3=False, MEDIA_URL="/media/", _BOOT_MEDIA_URL="/media/")
    runtime = build_s3_runtime_settings(source)
    assert runtime["USE_S3"] is False
    assert runtime["STORAGES"]["default"]["BACKEND"].endswith("FileSystemStorage")


def test_build_s3_runtime_settings_r2():
    source = SimpleNamespace(
        USE_S3=True,
        AWS_STORAGE_BUCKET_NAME="hollow",
        AWS_S3_CUSTOM_DOMAIN="storage.example.com",
        AWS_S3_PRIVATE_MEDIA=True,
        AWS_QUERYSTRING_EXPIRE=1800,
        AWS_LOCATION="media",
        AWS_S3_ENDPOINT_URL="https://acct.r2.cloudflarestorage.com",
    )
    runtime = build_s3_runtime_settings(source)
    assert runtime["USE_S3"] is True
    assert runtime["AWS_QUERYSTRING_AUTH"] is True
    assert runtime["MEDIA_URL"] == "https://storage.example.com/media/"
    assert runtime["STORAGES"]["default"]["BACKEND"] == "common.storage_s3.MediaStorage"
    assert runtime["AWS_S3_CLIENT_CONFIG"] is not None


def test_apply_media_storage_mutates_module():
    module = SimpleNamespace(
        USE_S3=False,
        MEDIA_URL="/media/",
        AWS_ACCESS_KEY_ID="",
        AWS_SECRET_ACCESS_KEY="",
        AWS_STORAGE_BUCKET_NAME="",
        AWS_S3_REGION_NAME="auto",
        AWS_S3_ENDPOINT_URL="",
        AWS_S3_CUSTOM_DOMAIN="",
        AWS_S3_PRIVATE_MEDIA=False,
        AWS_QUERYSTRING_EXPIRE=3600,
        AWS_LOCATION="media",
    )
    apply_media_storage(module)
    assert module._BOOT_MEDIA_URL == "/media/"
    module.USE_S3 = True
    module.AWS_STORAGE_BUCKET_NAME = "bucket"
    module.AWS_S3_CUSTOM_DOMAIN = "cdn.test"
    apply_media_storage(module)
    assert module.MEDIA_URL == "https://cdn.test/media/"
