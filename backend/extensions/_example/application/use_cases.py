"""Casos de uso da extensão de exemplo."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ExtensionPingResult:
    """Resposta pública do ping da extensão."""

    ok: bool
    extension: str


class PingExtensionUseCase:
    """Confirma que a extensão está carregada e o DI resolve o caso de uso.

    Não acessa banco nem o core de negócio; serve como fumaça de instalação.
    """

    def execute(self) -> ExtensionPingResult:
        return ExtensionPingResult(ok=True, extension="example")
