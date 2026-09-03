def get_logging_config(
    env, *, default_format="console", default_app_level=None, default_environment="development"
):
    log_level = env("LOG_LEVEL", default="INFO")
    app_log_level = env("APP_LOG_LEVEL", default=default_app_level or log_level)
    log_format = env("LOG_FORMAT", default=default_format)
    formatter = "json" if log_format.lower() == "json" else "console"
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
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": formatter,
                "filters": ["request_context"],
            },
        },
        "root": {
            "handlers": ["console"],
            "level": log_level,
        },
        "loggers": {
            "django": {
                "handlers": ["console"],
                "level": env("DJANGO_LOG_LEVEL", default=log_level),
                "propagate": False,
            },
            "django.server": {
                "handlers": ["console"],
                "level": env("DJANGO_LOG_LEVEL", default=log_level),
                "propagate": False,
            },
            "django.db.backends": {
                "handlers": ["console"],
                "level": "ERROR",
                "propagate": False,
            },
            "apps": {
                "handlers": ["console"],
                "level": app_log_level,
                "propagate": False,
            },
            "celery": {
                "handlers": ["console"],
                "level": log_level,
                "propagate": False,
            },
            "asgi": {
                "handlers": ["console"],
                "level": log_level,
                "propagate": False,
            },
        },
    }
