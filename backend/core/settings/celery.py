from celery.schedules import crontab


def get_celery_settings(env):
    redis_url = env("REDIS_URL", default="redis://redis:6379/0")
    beat_schedule = {}

    if env.bool("AUCTION_CLOSE_ENABLED", default=True):
        beat_schedule["close-expired-auctions"] = {
            "task": "apps.auction.tasks.close_expired_auctions",
            "schedule": crontab(minute="*"),
        }

    return {
        "CELERY_BROKER_URL": redis_url,
        "CELERY_RESULT_BACKEND": redis_url,
        "CELERY_ACCEPT_CONTENT": ["json"],
        "CELERY_TASK_SERIALIZER": "json",
        "CELERY_RESULT_SERIALIZER": "json",
        "CELERY_TIMEZONE": "America/Sao_Paulo",
        "CELERY_TASK_TRACK_STARTED": True,
        "CELERY_TASK_TIME_LIMIT": 30 * 60,
        "CELERY_WORKER_PREFETCH_MULTIPLIER": 1,
        "CELERY_TASK_ACKS_LATE": True,
        "CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP": True,
        "CELERY_BEAT_SCHEDULE": beat_schedule,
    }
