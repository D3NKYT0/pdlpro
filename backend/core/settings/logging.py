from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_LOG_DIR = BACKEND_ROOT / "log"


def resolve_log_dir(configured: str | Path | None = None) -> Path:
    """Resolve the backend log directory.

    Arquivos ``.log`` do backend ficam apenas em um diretório chamado ``log``
    (padrão: ``backend/log/``).
    """
    path = Path(configured or DEFAULT_LOG_DIR).expanduser()
    if not path.is_absolute():
        path = (BACKEND_ROOT / path).resolve()
    else:
        path = path.resolve()
    if path.name != "log":
        raise ValueError(
            f"LOG_DIR deve ser uma pasta chamada 'log' (recebido: {path}). "
            "Use backend/log/ — não grave .log na raiz nem em apps/."
        )
    path.mkdir(parents=True, exist_ok=True)
    return path


def get_logging_config(
    env,
    *,
    default_format="console",
    default_app_level=None,
    default_environment="development",
    default_log_to_file=False,
):
    log_level = env("LOG_LEVEL", default="INFO")
    app_log_level = env("APP_LOG_LEVEL", default=default_app_level or log_level)
    log_format = env("LOG_FORMAT", default=default_format)
    formatter = "json" if log_format.lower() == "json" else "console"
    log_to_file = env.bool("LOG_TO_FILE", default=default_log_to_file)

    handlers = {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": formatter,
            "filters": ["request_context"],
        },
    }
    handler_names = ["console"]

    if log_to_file:
        log_dir = resolve_log_dir(env("LOG_DIR", default=str(DEFAULT_LOG_DIR)))
        handlers["file"] = {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": str(log_dir / "app.log"),
            "maxBytes": env.int("LOG_FILE_MAX_BYTES", default=10 * 1024 * 1024),
            "backupCount": env.int("LOG_FILE_BACKUP_COUNT", default=5),
            "encoding": "utf-8",
            "formatter": formatter,
            "filters": ["request_context"],
        }
        handler_names = ["console", "file"]

    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "console": {
                "format": "[{asctime}] {levelname} [{name}:{lineno}] request_id={request_id} {message}",
                "style": "{",
            },
            "json": {
                "()": "common.observability.JsonFormatter",
                "service": env("SERVICE_NAME", default="pdl-backend"),
                "environment": env("LOG_ENVIRONMENT", default=default_environment),
            },
        },
        "filters": {"request_context": {"()": "common.observability.RequestContextFilter"}},
        "handlers": handlers,
        "root": {
            "handlers": handler_names,
            "level": log_level,
        },
        "loggers": {
            "django": {
                "handlers": handler_names,
                "level": env("DJANGO_LOG_LEVEL", default=log_level),
                "propagate": False,
            },
            "django.server": {
                "handlers": handler_names,
                "level": env("DJANGO_LOG_LEVEL", default=log_level),
                "propagate": False,
            },
            "django.db.backends": {
                "handlers": handler_names,
                "level": "ERROR",
                "propagate": False,
            },
            "apps": {
                "handlers": handler_names,
                "level": app_log_level,
                "propagate": False,
            },
            "celery": {
                "handlers": handler_names,
                "level": log_level,
                "propagate": False,
            },
            "asgi": {
                "handlers": handler_names,
                "level": log_level,
                "propagate": False,
            },
        },
    }
