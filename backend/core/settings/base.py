"""Django settings base — PDL PRO."""

import sys
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
from .security import build_content_security_policy

BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env(DEBUG=(bool, False))

_repo_env = BASE_DIR.parent / ".env"
if _repo_env.is_file():
    environ.Env.read_env(_repo_env)
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("SECRET_KEY", default="django-insecure-change-me-in-production-please")
SECRET_KEY_FALLBACKS = env.list("SECRET_KEY_FALLBACKS", default=[])
SECRET_KEY_ROTATED_AT = env("SECRET_KEY_ROTATED_AT", default="")
SECRET_KEY_FALLBACK_TTL_DAYS = env.int("SECRET_KEY_FALLBACK_TTL_DAYS", default=7)
SECRET_KEY_FALLBACK_MAX = env.int("SECRET_KEY_FALLBACK_MAX", default=3)
SECRET_KEY_AUTO_ROTATE_DAYS = env.int("SECRET_KEY_AUTO_ROTATE_DAYS", default=0)
PDL_DATA_ENCRYPTION_KEY = env("PDL_DATA_ENCRYPTION_KEY", default="")
PDL_DATA_ENCRYPTION_KEY_FALLBACKS = env.list("PDL_DATA_ENCRYPTION_KEY_FALLBACKS", default=[])
PDL_DATA_HMAC_KEY = env("PDL_DATA_HMAC_KEY", default="")
PDL_DATA_ENCRYPTION_ROTATED_AT = env("PDL_DATA_ENCRYPTION_ROTATED_AT", default="")
BACKUP_ENCRYPTION_KEY = env("BACKUP_ENCRYPTION_KEY", default="")
BACKUP_ENCRYPTION_KEY_FALLBACKS = env.list("BACKUP_ENCRYPTION_KEY_FALLBACKS", default=[])
PDL_ALLOW_RUNTIME_SECRET_ROTATION = env.bool("PDL_ALLOW_RUNTIME_SECRET_ROTATION", default=False)
PDL_ENV_FILE = env("PDL_ENV_FILE", default="")
DEBUG = env.bool("DEBUG", default=False)
OPENAPI_DOCS_PUBLIC = env.bool("OPENAPI_DOCS_PUBLIC", default=False)
AUDIT_LOG_RETENTION_DAYS = env.int("AUDIT_LOG_RETENTION_DAYS", default=365)
WEBHOOK_LOG_RETENTION_DAYS = env.int("WEBHOOK_LOG_RETENTION_DAYS", default=90)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True
TRUSTED_PROXY_COUNT = env.int("TRUSTED_PROXY_COUNT", default=2)

from extensions.loader import (
    discover_extension_locale_paths,
    merge_extension_apps,
    parse_extension_apps,
)

INSTALLED_APPS = merge_extension_apps(
    INSTALLED_APPS_PDL,
    parse_extension_apps(env.list("PDL_EXTENSION_APPS", default=[])),
)
MIDDLEWARE = MIDDLEWARE_PDL
ROOT_URLCONF = "core.urls"
WSGI_APPLICATION = "core.wsgi.application"
ASGI_APPLICATION = "core.asgi.application"

SITE_ID = env.int("SITE_ID", default=1)
AUTH_USER_MODEL = "accounts.User"
LEGAL_DOCS_VERSION = env("LEGAL_DOCS_VERSION", default="2026-09-10")
LEGAL_CONTROLLER_NAME = env("LEGAL_CONTROLLER_NAME", default="Operador do servidor")
LEGAL_TRADE_NAME = env("LEGAL_TRADE_NAME", default="PDL PRO")
LEGAL_CNPJ = env("LEGAL_CNPJ", default="00.000.000/0000-00")
LEGAL_ADDRESS = env("LEGAL_ADDRESS", default="Brasil")
LEGAL_CONTACT_EMAIL = env("LEGAL_CONTACT_EMAIL", default="contato@example.com")
LEGAL_DPO_EMAIL = env("LEGAL_DPO_EMAIL", default="dpo@example.com")
LEGAL_LEGAL_EMAIL = env("LEGAL_LEGAL_EMAIL", default="juridico@example.com")
LEGAL_FORUM = env("LEGAL_FORUM", default="Brasil")

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

REDIS_URL = env("REDIS_URL", default="redis://127.0.0.1:6379/0")
REDIS_PASSWORD = env("REDIS_PASSWORD", default="")

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL,
        "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
    }
}

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [REDIS_URL],
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
                "django.template.context_processors.i18n",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

LANGUAGE_CODE = env("CONFIG_LANGUAGE_CODE", default="pt-br")
LANGUAGES = [
    ("pt-br", "Português"),
    ("en", "English"),
    ("es", "Español"),
]
LOCALE_PATHS = [BASE_DIR / "locale", *discover_extension_locale_paths(BASE_DIR / "extensions")]
TIME_ZONE = env("CONFIG_TIME_ZONE", default="America/Sao_Paulo")
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"] if (BASE_DIR / "static").exists() else []
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
# Fora de MEDIA_ROOT de propósito: o Nginx serve /media/, então nada aqui pode
# ficar acessível sem passar por uma view que confere autorização.
# O valor pode chegar vazio pelo .env; nesse caso vale o diretório padrão.
PRIVATE_MEDIA_ROOT = Path(env("PRIVATE_MEDIA_ROOT", default="") or BASE_DIR / "private")

# Cloudflare R2 / S3-compatível (hot-apply via /panel/admin/integrations → storage).
USE_S3 = env.bool("USE_S3", default=False)
AWS_ACCESS_KEY_ID = env("AWS_ACCESS_KEY_ID", default="")
AWS_SECRET_ACCESS_KEY = env("AWS_SECRET_ACCESS_KEY", default="")
AWS_STORAGE_BUCKET_NAME = env("AWS_STORAGE_BUCKET_NAME", default="")
AWS_S3_REGION_NAME = env("AWS_S3_REGION_NAME", default="auto")
AWS_S3_ENDPOINT_URL = env("AWS_S3_ENDPOINT_URL", default="")
AWS_S3_CUSTOM_DOMAIN = env("AWS_S3_CUSTOM_DOMAIN", default="")
AWS_S3_PRIVATE_MEDIA = env.bool("AWS_S3_PRIVATE_MEDIA", default=False)
AWS_QUERYSTRING_EXPIRE = env.int("AWS_QUERYSTRING_EXPIRE", default=3600)
AWS_LOCATION = env("AWS_LOCATION", default="media")
_BOOT_MEDIA_URL = MEDIA_URL

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = get_rest_framework_settings(TRUSTED_PROXY_COUNT)
SPECTACULAR_SETTINGS = get_spectacular_settings(API_VERSION)
LOGGING = get_logging_config(env)
globals().update(get_celery_settings(env))

SIMPLE_JWT = {
    "CHECK_REVOKE_TOKEN": True,
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env.int("ACCESS_TOKEN_MINUTES", default=15)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env.int("REFRESH_TOKEN_DAYS", default=7)),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

PASSWORD_RESET_TIMEOUT = 3600

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

CONTENT_SECURITY_POLICY = build_content_security_policy()
CONTENT_SECURITY_POLICY_HTML = build_content_security_policy(script_unsafe_inline=True)

JAZZMIN_SETTINGS = JAZZMIN_SETTINGS_PDL
JAZZMIN_UI_TWEAKS = JAZZMIN_UI_TWEAKS_PDL

PROJECT_TITLE = env("PROJECT_TITLE", default="PDL PRO")
PROJECT_DESCRIPTION = env("PROJECT_DESCRIPTION", default="Painel Definitivo Lineage 2.0")
SITE_SEO_TITLE = env("SITE_SEO_TITLE", default="")
SITE_SEO_DESCRIPTION = env("SITE_SEO_DESCRIPTION", default="")
SITE_OG_IMAGE = env("SITE_OG_IMAGE", default="")
DISCORD_URL = env("DISCORD_URL", default=env("VITE_DISCORD_URL", default=""))
TRAILER_YOUTUBE_ID = env("TRAILER_YOUTUBE_ID", default=env("VITE_TRAILER_YOUTUBE_ID", default=""))
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
# Exposed to Jazzmin chrome (admin header → Painel), matching OpenAPI docs topbar.
JAZZMIN_SETTINGS["frontend_url"] = FRONTEND_URL
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
LINEAGE_DB_SSL = env.bool("LINEAGE_DB_SSL", default=False)
LINEAGE_DB_SSL_VERIFY = env.bool("LINEAGE_DB_SSL_VERIFY", default=True)
LINEAGE_DB_SSL_CA = env("LINEAGE_DB_SSL_CA", default="")
LINEAGE_DB_SSL_CERT = env("LINEAGE_DB_SSL_CERT", default="")
LINEAGE_DB_SSL_KEY = env("LINEAGE_DB_SSL_KEY", default="")
LINEAGE_QUERY_MODULE = env("LINEAGE_QUERY_MODULE", default="lucerav2")
LINEAGE_PASSWORD_ALGO = env("LINEAGE_PASSWORD_ALGO", default="").strip().lower()
LINEAGE_ITEM_XML_DIR = env("LINEAGE_ITEM_XML_DIR", default=str(BASE_DIR / "data" / "items"))
LINEAGE_SKILL_XML_DIR = env("LINEAGE_SKILL_XML_DIR", default=str(BASE_DIR / "data" / "skills"))
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
EMAIL_HOST = env("EMAIL_HOST", default="")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
EMAIL_USE_SSL = env.bool("EMAIL_USE_SSL", default=False)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="noreply@localhost")

WEBSOCKET_ALLOWED_ORIGINS = env.list(
    "WEBSOCKET_ALLOWED_ORIGINS",
    default=["http://localhost:3000", "http://127.0.0.1:3000"],
)

DENKYNHO_LLM_ENABLED = env.bool("DENKYNHO_LLM_ENABLED", default=False)
DENKYNHO_LLM_PROVIDER = env("DENKYNHO_LLM_PROVIDER", default="ollama")
DENKYNHO_OLLAMA_URL = env("DENKYNHO_OLLAMA_URL", default="http://127.0.0.1:11434")
DENKYNHO_OLLAMA_DOCKER = env.bool("DENKYNHO_OLLAMA_DOCKER", default=False)
DENKYNHO_LLM_MODEL = env("DENKYNHO_LLM_MODEL", default="qwen3.5:4b")
DENKYNHO_LLM_TIMEOUT = env.float("DENKYNHO_LLM_TIMEOUT", default=120)
DENKYNHO_LLM_API_URL = env("DENKYNHO_LLM_API_URL", default="")
DENKYNHO_LLM_API_KEY = env("DENKYNHO_LLM_API_KEY", default="")
DENKYNHO_EMBEDDINGS_ENABLED = env.bool("DENKYNHO_EMBEDDINGS_ENABLED", default=True)
DENKYNHO_EMBEDDING_MODEL = env(
    "DENKYNHO_EMBEDDING_MODEL",
    default="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
)

SENTRY_DSN = env("SENTRY_DSN", default="")
SENTRY_ENVIRONMENT = env("SENTRY_ENVIRONMENT", default="development")
SENTRY_RELEASE = env("SENTRY_RELEASE", default="")
SENTRY_TRACES_SAMPLE_RATE = env.float("SENTRY_TRACES_SAMPLE_RATE", default=0.0)

from common.storage_config import apply_media_storage

apply_media_storage(sys.modules[__name__])

