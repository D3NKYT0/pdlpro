from .base import *  # noqa: F403
from .monitoring import configure_error_monitoring

DEBUG = False
LOGGING = get_logging_config(env, default_format="json", default_environment="production")  # noqa: F405
SENTRY_ENABLED = configure_error_monitoring(env)  # noqa: F405

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_HSTS_SECONDS = 31_536_000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

ACCOUNT_EMAIL_VERIFICATION = "mandatory"
ACCOUNT_DEFAULT_HTTP_PROTOCOL = "https"

REST_AUTH.update(  # noqa: F405
    {
        "JWT_AUTH_SECURE": True,
        "JWT_AUTH_HTTPONLY": True,
        "JWT_AUTH_SAMESITE": "Lax",
    }
)

# MiniLM continua disponível; o padrão desligado evita baixar Hugging Face no
# primeiro chat. A geração local ou remota liga-se por DENKYNHO_LLM_ENABLED.
DENKYNHO_EMBEDDINGS_ENABLED = env.bool("DENKYNHO_EMBEDDINGS_ENABLED", default=False)  # noqa: F405
