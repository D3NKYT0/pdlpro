def get_logging_config(env):
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "verbose": {
                "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
                "style": "{",
            },
            "simple": {
                "format": "{levelname} {asctime} {module} {message}",
                "style": "{",
            },
            "rich": {
                "format": "[{asctime}] {levelname} [{name}:{lineno}] {message}",
                "style": "{",
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "rich",
            },
            "django.server": {
                "level": "INFO",
                "class": "logging.StreamHandler",
                "formatter": "simple",
            },
        },
        "root": {
            "handlers": ["console"],
            "level": "INFO",
        },
        "loggers": {
            "django": {
                "handlers": ["console"],
                "level": env("DJANGO_LOG_LEVEL", default="INFO"),
                "propagate": False,
            },
            "django.server": {
                "handlers": ["django.server"],
                "level": "INFO",
                "propagate": False,
            },
            "django.db.backends": {
                "handlers": ["console"],
                "level": "ERROR",
                "propagate": False,
            },
            "apps": {
                "handlers": ["console"],
                "level": "DEBUG",
                "propagate": False,
            },
            "celery": {
                "handlers": ["console"],
                "level": "INFO",
                "propagate": False,
            },
            "asgi": {
                "handlers": ["console"],
                "level": "DEBUG",
                "propagate": False,
            },
        },
    }
