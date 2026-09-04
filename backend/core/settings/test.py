import os

os.environ["REDIS_URL"] = "memory://"

from .development import *  # noqa: E402, F403

os.environ["REDIS_URL"] = "memory://"

TESTING = True
PAYMENT_METHODS = ["mock", "mercadopago", "stripe"]
PAYMENT_ALLOW_MOCK = True
PAYMENT_MOCK_AUTO_CONFIRM = True
SECRET_KEY = "django-insecure-test-key-with-more-than-thirty-two-characters-for-jwt"
DEBUG = False
LINEAGE_DB_ENABLED = False

DATABASES = {  # noqa: F405
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "test.sqlite3",  # noqa: F405
    }
}

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "pdl-tests",
    }
}

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}

CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
CELERY_BROKER_URL = "memory://"
CELERY_RESULT_BACKEND = "cache+memory://"

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.InMemoryStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}

# Testes de geração habilitam explicitamente e simulam apenas o SDK externo.
DENKYNHO_LLM_ENABLED = False
