"""Django settings base — PDL PRO."""

from datetime import timedelta
from pathlib import Path

import environ

from common.version import API_VERSION

from .api import get_rest_framework_settings, get_spectacular_settings
from .apps import INSTALLED_APPS_PDL
from .celery import get_celery_settings
from .jazzmin import JAZZMIN_SETTINGS_PDL, JAZZMIN_UI_TWEAKS_PDL
from .logging import get_logging_config
from .middleware import MIDDLEWARE_PDL

BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env(DEBUG=(bool, False))

_repo_env = BASE_DIR.parent / ".env"
if _repo_env.is_file():
    environ.Env.read_env(_repo_env)
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("SECRET_KEY", default="django-insecure-change-me-in-production-please")
DEBUG = env.bool("DEBUG", default=False)
OPENAPI_DOCS_PUBLIC = env.bool("OPENAPI_DOCS_PUBLIC", default=False)
AUDIT_LOG_RETENTION_DAYS = env.int("AUDIT_LOG_RETENTION_DAYS", default=365)
WEBHOOK_LOG_RETENTION_DAYS = env.int("WEBHOOK_LOG_RETENTION_DAYS", default=90)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True
TRUSTED_PROXY_COUNT = env.int("TRUSTED_PROXY_COUNT", default=1)

INSTALLED_APPS = INSTALLED_APPS_PDL
MIDDLEWARE = MIDDLEWARE_PDL
ROOT_URLCONF = "core.urls"
WSGI_APPLICATION = "core.wsgi.application"
ASGI_APPLICATION = "core.asgi.application"

SITE_ID = env.int("SITE_ID", default=1)
AUTH_USER_MODEL = "accounts.User"
LEGAL_DOCS_VERSION = env("LEGAL_DOCS_VERSION", default="2026-08-31")

AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
]

ACCOUNT_LOGIN_METHODS = {"username", "email"}
ACCOUNT_SIGNUP_FIELDS = ["username*", "email*", "password1*", "password2*"]
ACCOUNT_EMAIL_VERIFICATION = "mandatory"

REST_AUTH = {
    "USE_JWT": True,
    "TOKEN_MODEL": None,
    "JWT_AUTH_COOKIE": env("JWT_AUTH_COOKIE", default="PDL-auth"),
    "JWT_AUTH_REFRESH_COOKIE": env("JWT_AUTH_REFRESH_COOKIE", default="PDL-refresh"),
    "JWT_AUTH_HTTPONLY": True,
    "JWT_AUTH_SAMESITE": "Lax",
    "JWT_AUTH_SECURE": False,
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 8},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

DATABASES = {
    "default": env.db(
        "DATABASE_URL",
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
    )
}

# URLs SQLite relativas devem apontar sempre para o backend, independentemente
# da pasta a partir da qual um comando de gerenciamento foi executado.
if DATABASES["default"]["ENGINE"] == "django.db.backends.sqlite3":
    sqlite_name = Path(DATABASES["default"]["NAME"])
    if not sqlite_name.is_absolute():
        DATABASES["default"]["NAME"] = BASE_DIR / sqlite_name

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": env("REDIS_URL", default="redis://127.0.0.1:6379/0"),
        "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
    }
}

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [env("REDIS_URL", default="redis://127.0.0.1:6379/0")],
        },
    }
}

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

LANGUAGE_CODE = env("CONFIG_LANGUAGE_CODE", default="pt-br")
TIME_ZONE = env("CONFIG_TIME_ZONE", default="America/Sao_Paulo")
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"] if (BASE_DIR / "static").exists() else []
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = get_rest_framework_settings()
SPECTACULAR_SETTINGS = get_spectacular_settings(API_VERSION)
LOGGING = get_logging_config(env)
globals().update(get_celery_settings(env))

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env.int("ACCESS_TOKEN_MINUTES", default=15)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env.int("REFRESH_TOKEN_DAYS", default=7)),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

CORS_ALLOW_CREDENTIALS = True
CORS_EXPOSE_HEADERS = ["X-Request-ID"]
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=["http://localhost:3000", "http://127.0.0.1:3000"],
)
CSRF_TRUSTED_ORIGINS = env.list(
    "CSRF_TRUSTED_ORIGINS",
    default=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost"],
)

JAZZMIN_SETTINGS = JAZZMIN_SETTINGS_PDL
JAZZMIN_UI_TWEAKS = JAZZMIN_UI_TWEAKS_PDL

PROJECT_TITLE = env("PROJECT_TITLE", default="PDL PRO")
PROJECT_DESCRIPTION = env("PROJECT_DESCRIPTION", default="Painel Definitivo Lineage 2.0")
SERVER_CHRONICLE = env("SERVER_CHRONICLE", default="")
XP_RATE = env("XP_RATE", default="x1")
SP_RATE = env("SP_RATE", default="x1")
ADENA_RATE = env("ADENA_RATE", default="x1")
DROP_RATE = env("DROP_RATE", default="x1")
SPOIL_RATE = env("SPOIL_RATE", default="x1")
ENCHANT_SAFE = env("ENCHANT_SAFE", default="+3")
ENCHANT_MAX = env("ENCHANT_MAX", default="+16")
MAX_LEVEL = env.int("MAX_LEVEL", default=80)
SERVER_FEATURES = env.list(
    "SERVER_FEATURES",
    default=["PvP e guerras de castelo", "Eventos periódicos", "Loja e marketplace no painel"],
)
SERVER_PVP_NOTE = env(
    "SERVER_PVP_NOTE",
    default="Combate livre nas zonas de PvP. Castelos seguem o calendário de siege.",
)
SERVER_START_NOTE = env(
    "SERVER_START_NOTE",
    default="Crie a conta mestra, baixe o cliente e vincule o login Lineage no painel.",
)
PROJECT_URL = env("PROJECT_URL", default="http://localhost")
FRONTEND_URL = env("FRONTEND_URL", default="http://localhost:3000")
WEBAUTHN_RP_ID = env("WEBAUTHN_RP_ID", default="")
WEBAUTHN_RP_NAME = env("WEBAUTHN_RP_NAME", default="PDL PRO")
WEBAUTHN_ORIGINS = env.list("WEBAUTHN_ORIGINS", default=[])
HCAPTCHA_SITE_KEY = env("HCAPTCHA_SITE_KEY", default=env("VITE_HCAPTCHA_SITEKEY", default=""))
HCAPTCHA_SECRET_KEY = env("HCAPTCHA_SECRET_KEY", default="")
HCAPTCHA_ENABLED = bool(HCAPTCHA_SITE_KEY and HCAPTCHA_SECRET_KEY)
GOOGLE_CLIENT_ID = env("GOOGLE_CLIENT_ID", default=env("VITE_GOOGLE_CLIENT_ID", default=""))
GOOGLE_CLIENT_SECRET = env("GOOGLE_CLIENT_SECRET", default="")
DISCORD_CLIENT_ID = env("DISCORD_CLIENT_ID", default=env("VITE_DISCORD_CLIENT_ID", default=""))
DISCORD_CLIENT_SECRET = env("DISCORD_CLIENT_SECRET", default="")
VAPID_PUBLIC_KEY = env("VAPID_PUBLIC_KEY", default="")
VAPID_PRIVATE_KEY = env("VAPID_PRIVATE_KEY", default="")
VAPID_SUBJECT = env("VAPID_SUBJECT", default="mailto:noreply@localhost")

LINEAGE_DB_ENABLED = env.bool("LINEAGE_DB_ENABLED", default=False)
LINEAGE_DB_HOST = env("LINEAGE_DB_HOST", default="127.0.0.1")
LINEAGE_DB_PORT = env.int("LINEAGE_DB_PORT", default=3306)
LINEAGE_DB_NAME = env("LINEAGE_DB_NAME", default="l2jdb")
LINEAGE_DB_USER = env("LINEAGE_DB_USER", default="l2user")
LINEAGE_DB_PASSWORD = env("LINEAGE_DB_PASSWORD", default="")
LINEAGE_QUERY_MODULE = env("LINEAGE_QUERY_MODULE", default="lucerav2")
LINEAGE_ITEM_XML_DIR = env("LINEAGE_ITEM_XML_DIR", default=str(BASE_DIR / "data" / "items"))
LINEAGE_DB_POOL_SIZE = env.int("LINEAGE_DB_POOL_SIZE", default=2)
LINEAGE_DB_MAX_OVERFLOW = env.int("LINEAGE_DB_MAX_OVERFLOW", default=4)

GAME_SERVER_IP = env("GAME_SERVER_IP", default="127.0.0.1")
GAME_SERVER_PORT = env.int("GAME_SERVER_PORT", default=7777)
LOGIN_SERVER_PORT = env.int("LOGIN_SERVER_PORT", default=2106)
SERVER_STATUS_TIMEOUT = env.float("SERVER_STATUS_TIMEOUT", default=2)
FAKE_PLAYERS_FACTOR = env.float("FAKE_PLAYERS_FACTOR", default=1)
FAKE_PLAYERS_MIN = env.int("FAKE_PLAYERS_MIN", default=0)
FAKE_PLAYERS_MAX = env.int("FAKE_PLAYERS_MAX", default=0)

ACCOUNT_LINK_FREE_SLOTS = env.int("ACCOUNT_LINK_FREE_SLOTS", default=3)
MARKETPLACE_MASTER_ACCOUNT = env("MARKETPLACE_MASTER_ACCOUNT", default="MARKETPLACE_SYSTEM")
MAX_CHARACTERS_PER_ACCOUNT = env.int("MAX_CHARACTERS_PER_ACCOUNT", default=7)
PAYMENT_METHODS = env.list("PAYMENT_METHODS", default=["mercadopago", "stripe"])
PAYMENT_ALLOW_MOCK = env.bool("PAYMENT_ALLOW_MOCK", default=False)
PAYMENT_MOCK_AUTO_CONFIRM = env.bool("PAYMENT_MOCK_AUTO_CONFIRM", default=False)
PAYMENT_REUSE_HOURS = env.int("PAYMENT_REUSE_HOURS", default=2)
PAYMENT_WEBHOOK_BASE_URL = env("PAYMENT_WEBHOOK_BASE_URL", default="")
COINS_PER_USD = env("COINS_PER_USD", default="5.00")
MERCADO_PAGO_ACCESS_TOKEN = env("MERCADO_PAGO_ACCESS_TOKEN", default="")
MERCADO_PAGO_PUBLIC_KEY = env("MERCADO_PAGO_PUBLIC_KEY", default="")
MERCADO_PAGO_WEBHOOK_SECRET = env("MERCADO_PAGO_WEBHOOK_SECRET", default="")
MERCADO_PAGO_ACTIVATE_PAYMENTS = env.bool("MERCADO_PAGO_ACTIVATE_PAYMENTS", default=False)
STRIPE_SECRET_KEY = env("STRIPE_SECRET_KEY", default="")
STRIPE_PUBLISHABLE_KEY = env("STRIPE_PUBLISHABLE_KEY", default="")
STRIPE_WEBHOOK_SECRET = env("STRIPE_WEBHOOK_SECRET", default="")
STRIPE_ACTIVATE_PAYMENTS = env.bool("STRIPE_ACTIVATE_PAYMENTS", default=False)

EMAIL_BACKEND = env(
    "EMAIL_BACKEND",
    default="django.core.mail.backends.console.EmailBackend",
)
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="noreply@localhost")

WEBSOCKET_ALLOWED_ORIGINS = env.list(
    "WEBSOCKET_ALLOWED_ORIGINS",
    default=["http://localhost:3000", "http://127.0.0.1:3000"],
)

DENKYNHO_LLM_ENABLED = env.bool("DENKYNHO_LLM_ENABLED", default=False)
DENKYNHO_OLLAMA_URL = env("DENKYNHO_OLLAMA_URL", default="http://127.0.0.1:11434")
DENKYNHO_OLLAMA_DOCKER = env.bool("DENKYNHO_OLLAMA_DOCKER", default=False)
DENKYNHO_LLM_MODEL = env("DENKYNHO_LLM_MODEL", default="qwen3.5:4b")
DENKYNHO_LLM_TIMEOUT = env.float("DENKYNHO_LLM_TIMEOUT", default=120)
