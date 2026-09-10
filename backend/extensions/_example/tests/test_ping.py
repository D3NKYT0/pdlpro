"""Testes da extensão de exemplo (caso de uso puro, sem Django HTTP)."""

from extensions._example.application.use_cases import PingExtensionUseCase


def test_ping_extension_use_case():
    result = PingExtensionUseCase().execute()
    assert result.ok is True
    assert result.extension == "example"
