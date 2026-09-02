"""Isolated local visual QA; no live game or payment providers."""

from .test import *  # noqa: F403

DEBUG = True
PDL_QA_PREVIEW = True
TESTING = False
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "preview.sqlite3",  # noqa: F405
    }
}
CSRF_TRUSTED_ORIGINS = ["http://localhost:3001", "http://127.0.0.1:3001"]
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}
MEDIA_ROOT = BASE_DIR / "media" / "preview"  # noqa: F405
PAYMENT_METHODS = ["mock"]
HCAPTCHA_SITE_KEY = ""
HCAPTCHA_SECRET_KEY = ""
