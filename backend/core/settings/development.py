from .base import *  # noqa: F403

DEBUG = True
OPENAPI_DOCS_PUBLIC = True
LOGGING = get_logging_config(env, default_app_level="DEBUG")  # noqa: F405

CORS_ALLOW_ALL_ORIGINS = True
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost",
]
ACCOUNT_EMAIL_VERIFICATION = "none"

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "pdl-dev",
    }
}

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}

if "django_extensions" not in INSTALLED_APPS:  # noqa: F405
    INSTALLED_APPS += ["django_extensions"]  # noqa: F405
