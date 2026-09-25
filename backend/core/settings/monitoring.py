def configure_error_monitoring(env=None, *, dsn: str | None = None) -> bool:
    """Enable Sentry when a DSN is available. Safe to call again after hot-apply."""

    import sentry_sdk

    if env is not None:
        resolved = (dsn if dsn is not None else env("SENTRY_DSN", default="")).strip()
        if not resolved:
            return False
        sentry_sdk.init(
            dsn=resolved,
            environment=env("SENTRY_ENVIRONMENT", default="production"),
            release=env("SENTRY_RELEASE", default="") or None,
            send_default_pii=False,
            traces_sample_rate=env.float("SENTRY_TRACES_SAMPLE_RATE", default=0.05),
        )
        return True

    from django.conf import settings

    resolved = (dsn if dsn is not None else str(getattr(settings, "SENTRY_DSN", "") or "")).strip()
    if not resolved:
        return False

    release = str(getattr(settings, "SENTRY_RELEASE", "") or "").strip() or None
    sentry_sdk.init(
        dsn=resolved,
        environment=str(getattr(settings, "SENTRY_ENVIRONMENT", "") or "production"),
        release=release,
        send_default_pii=False,
        traces_sample_rate=float(getattr(settings, "SENTRY_TRACES_SAMPLE_RATE", 0.05) or 0),
    )
    return True
