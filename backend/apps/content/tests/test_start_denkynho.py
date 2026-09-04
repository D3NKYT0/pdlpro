from importlib import import_module
from io import StringIO

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError


@pytest.fixture
def runtime(settings, mocker):
    settings.DENKYNHO_LLM_ENABLED = True
    settings.DENKYNHO_OLLAMA_URL = "http://127.0.0.1:11434"
    client = mocker.patch("ollama.Client.list")
    process = mocker.patch("subprocess.Popen")
    mocker.patch("shutil.which", return_value="C:/runtime/ollama.exe")
    mocker.patch("time.sleep")
    return client, process


def test_reuses_running_server(runtime):
    _, process = runtime
    output = StringIO()
    call_command("start_denkynho", stdout=output)
    assert "Ollama pronto" in output.getvalue()
    process.assert_not_called()


def test_starts_without_cloud_or_visible_window(runtime):
    client, process = runtime
    client.side_effect = [ConnectionError(), {}, {}]
    call_command("start_denkynho")
    assert process.call_args.args[0] == ["C:/runtime/ollama.exe", "serve"]
    assert process.call_args.kwargs["env"]["OLLAMA_NO_CLOUD"] == "1"
    assert process.call_args.kwargs["env"]["OLLAMA_HOST"] == "127.0.0.1:11434"


def test_boot_times_out_without_launching_multiple_processes(runtime):
    client, process = runtime
    client.side_effect = ConnectionError()
    with pytest.raises(CommandError, match="não iniciou"):
        call_command("start_denkynho")
    process.assert_called_once()


def test_missing_runtime_explains_setup(runtime, mocker):
    client, _ = runtime
    client.side_effect = ConnectionError()
    mocker.patch("shutil.which", return_value=None)
    mocker.patch("pathlib.Path.is_file", return_value=False)
    with pytest.raises(CommandError, match="Instale Ollama"):
        call_command("start_denkynho")


def test_portable_runtime_is_supported(runtime, mocker):
    client, process = runtime
    client.side_effect = [ConnectionError(), {}]
    mocker.patch("shutil.which", return_value=None)
    mocker.patch("pathlib.Path.is_file", return_value=True)
    call_command("start_denkynho")
    assert "ollama.exe" in process.call_args.args[0][0]


def test_disabled_or_remote_config_never_starts_process(runtime, settings):
    client, process = runtime
    settings.DENKYNHO_LLM_ENABLED = False
    call_command("start_denkynho")
    client.assert_not_called()
    settings.DENKYNHO_LLM_ENABLED = True
    settings.DENKYNHO_OLLAMA_URL = "https://example.com"
    with pytest.raises(CommandError, match="Boot automático"):
        call_command("start_denkynho")
    process.assert_not_called()


@pytest.mark.django_db
def test_privacy_migration_preserves_custom_articles_and_reverses_both_languages():
    from django.apps import apps

    from apps.content.infrastructure.models import Faq

    migration = import_module("apps.content.migrations.0011_local_conversation_privacy")
    article = Faq.objects.get(id=migration.ARTICLE_ID)
    custom = Faq.objects.create(question="Custom", answer="Custom answer", answer_en="English")
    migration.restore_privacy(apps, None)
    article.refresh_from_db()
    assert "sem envio a um provedor" in article.answer
    assert "No. Denkynho" in article.answer_en
    migration.update_privacy(apps, None)
    article.refresh_from_db()
    assert "modelo local" in article.answer
    assert "local model" in article.answer_en
    custom.refresh_from_db()
    assert custom.answer == "Custom answer" and custom.answer_en == "English"
