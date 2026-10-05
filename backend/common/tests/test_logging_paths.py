import json
import logging
import subprocess
import sys
from pathlib import Path

import pytest
from django.utils.module_loading import import_string

from core.settings.logging import DEFAULT_LOG_DIR, get_logging_config, resolve_log_dir


class _Env:
    def __init__(self, values=None):
        self.values = values or {}

    def __call__(self, key, default=None):
        return self.values.get(key, default)

    def bool(self, key, default=False):
        value = self.values.get(key, default)
        if isinstance(value, bool):
            return value
        return str(value).lower() in {"1", "true", "yes", "on"}

    def int(self, key, default=0):
        return int(self.values.get(key, default))


def test_resolve_log_dir_defaults_to_backend_log(tmp_path, monkeypatch):
    monkeypatch.setattr("core.settings.logging.DEFAULT_LOG_DIR", tmp_path / "log")
    path = resolve_log_dir()
    assert path == (tmp_path / "log").resolve()
    assert path.is_dir()
    assert path.name == "log"


def test_resolve_log_dir_rejects_non_log_folder(tmp_path):
    with pytest.raises(ValueError, match="pasta chamada 'log'"):
        resolve_log_dir(tmp_path / "logs")


def test_file_logging_writes_under_log_directory(tmp_path):
    log_dir = tmp_path / "log"
    config = get_logging_config(
        _Env({"LOG_TO_FILE": True, "LOG_DIR": str(log_dir), "LOG_FORMAT": "console"}),
        default_log_to_file=False,
    )
    filename = Path(config["handlers"]["file"]["filename"])
    assert filename == log_dir.resolve() / "app.log"
    assert filename.parent.name == "log"
    assert "file" in config["root"]["handlers"]
    assert DEFAULT_LOG_DIR.name == "log"


def test_file_logging_disabled_keeps_console_only():
    config = get_logging_config(_Env({"LOG_TO_FILE": False}))
    assert list(config["handlers"]) == ["console"]
    assert config["root"]["handlers"] == ["console"]


def test_rotation_preserves_records_with_another_process_using_the_file(tmp_path):
    config = get_logging_config(_Env({
        "LOG_TO_FILE": True, "LOG_DIR": str(tmp_path / "log"),
        "LOG_FILE_MAX_BYTES": 128, "LOG_FILE_BACKUP_COUNT": 50,
    }))
    options = dict(config["handlers"]["file"])
    handler_class = options.pop("class")
    options.pop("formatter")
    options.pop("filters")
    handler = import_string(handler_class)(**options)
    worker = """
import json, logging, sys
from django.utils.module_loading import import_string
handler = import_string(sys.argv[1])(**json.loads(sys.argv[2]))
for index in range(30):
    handler.handle(logging.LogRecord('worker', logging.INFO, '', 0, f'child-{index}', (), None))
handler.close()
"""
    try:
        handler.handle(logging.LogRecord("parent", logging.INFO, "", 0, "parent-start", (), None))
        result = subprocess.run(
            [sys.executable, "-c", worker, handler_class, json.dumps(options)],
            capture_output=True, text=True, timeout=30, check=False,
        )
        assert result.returncode == 0, result.stderr
        assert "Logging error" not in result.stderr, result.stderr
        handler.handle(logging.LogRecord("parent", logging.INFO, "", 0, "parent-end", (), None))
    finally:
        handler.close()
    records = []
    for path in (tmp_path / "log").glob("app.log*"):
        records.extend(path.read_text(encoding="utf-8").splitlines())
    assert sorted(records) == sorted(["parent-start", "parent-end", *[f"child-{i}" for i in range(30)]])
    assert (tmp_path / "log" / "app.log.1").exists()
