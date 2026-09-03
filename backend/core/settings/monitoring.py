def configure_error_monitoring(env) -> bool:
    """Enable Sentry only when production provides a DSN; never require credentials locally."""

    dsn = env("SENTRY_DSN", default="").strip()
    if not dsn:
        return False

    import sentry_sdk

    sentry_sdk.init(
        dsn=dsn,
        environment=env("SENTRY_ENVIRONMENT", default="production"),
        release=env("SENTRY_RELEASE", default="") or None,
        send_default_pii=False,
        traces_sample_rate=env.float("SENTRY_TRACES_SAMPLE_RATE", default=0.05),
    )
    return True
