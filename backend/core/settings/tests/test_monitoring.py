from core.settings.monitoring import configure_error_monitoring


class FakeEnv:
    def __init__(self, values):
        self.values = values
        self.float = self

    def __call__(self, name, default=None):
        return self.values.get(name, default)


def test_error_monitoring_stays_disabled_without_dsn():
    assert configure_error_monitoring(FakeEnv({})) is False


def test_error_monitoring_uses_safe_production_defaults(monkeypatch):
    captured = {}
    monkeypatch.setattr("sentry_sdk.init", lambda **options: captured.update(options))

    enabled = configure_error_monitoring(FakeEnv({"SENTRY_DSN": "https://public@example.test/1"}))

    assert enabled is True
    assert captured["send_default_pii"] is False
    assert captured["environment"] == "production"
    assert captured["traces_sample_rate"] == 0.05
