"""Contrato da versão local e da API distribuída em imagem."""

import json

import pytest

from common import version


@pytest.mark.parametrize("declared", [{"api_version": "2.7.0", "version": "2.6.9"}, {"version": "2.7.0"}])
def test_local_version_uses_manifest(monkeypatch, tmp_path, declared):
    manifest = tmp_path / "version.json"
    manifest.write_text(json.dumps(declared), encoding="utf-8")
    monkeypatch.delenv("PDL_API_VERSION", raising=False)
    monkeypatch.setattr(version, "VERSION_FILE", manifest)
    assert version.read_version() == "2.7.0"


def test_published_api_reports_build_version_without_root_manifest(monkeypatch, tmp_path):
    monkeypatch.setenv("PDL_API_VERSION", "2.7.0")
    monkeypatch.setattr(version, "VERSION_FILE", tmp_path / "missing.json")
    deployed_version = version.read_version()
    from django.test import RequestFactory

    from core import views

    monkeypatch.setattr(views, "API_VERSION", deployed_version)
    response = views.backend_index(RequestFactory().get("/"))
    assert json.loads(response.content)["version"] == "2.7.0"


@pytest.mark.parametrize("contents", [None, "invalid json", "{}"])
def test_missing_or_invalid_manifest_keeps_legacy_fallback(monkeypatch, tmp_path, contents):
    manifest = tmp_path / "version.json"
    if contents is not None:
        manifest.write_text(contents, encoding="utf-8")
    monkeypatch.setenv("PDL_API_VERSION", " ")
    monkeypatch.setattr(version, "VERSION_FILE", manifest)
    assert version.read_version() == "1.0.0"
