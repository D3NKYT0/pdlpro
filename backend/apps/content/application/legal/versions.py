"""Histórico público de versões dos documentos legais."""

from __future__ import annotations

from dataclasses import dataclass

from django.conf import settings


@dataclass(frozen=True, slots=True)
class LegalVersionChange:
    area: str
    reason: str


@dataclass(frozen=True, slots=True)
class LegalVersionEntry:
    version: str
    effective_from: str
    effective_until: str | None
    title: str
    changes: tuple[LegalVersionChange, ...]


# Histórico em português (msgid editorial); títulos/razões localizados no use case.
LEGAL_DOCS_HISTORY: tuple[LegalVersionEntry, ...] = (
    LegalVersionEntry(
        version="2026-09-10",
        effective_from="2026-09-10",
        effective_until=None,
        title="Pacote legal completo LGPD, cookies e reaceitação",
        changes=(
            LegalVersionChange(
                area="Documentos legais",
                reason=(
                    "Publicação integral dos Termos de Uso, Política de Privacidade, Acordo do "
                    "Usuário, Política de Cookies e página LGPD adaptados ao painel Lineage 2."
                ),
            ),
            LegalVersionChange(
                area="Cookies e consentimento",
                reason=(
                    "Incluímos categorias de cookies, banner de preferências versionado e "
                    "histórico público de versões com reaceitação explícita no painel."
                ),
            ),
            LegalVersionChange(
                area="Auditoria de aceite",
                reason=(
                    "O aceite passa a registrar versão, data, endereço IP e user-agent para "
                    "comprovação do consentimento."
                ),
            ),
        ),
    ),
    LegalVersionEntry(
        version="2026-08-31",
        effective_from="2026-08-31",
        effective_until="2026-09-09",
        title="Textos placeholder iniciais",
        changes=(
            LegalVersionChange(
                area="Publicação inicial",
                reason=(
                    "Primeira publicação resumida de Termos, Privacidade e Acordo do Usuário "
                    "no portal público do PDL PRO."
                ),
            ),
        ),
    ),
)


def current_legal_docs_version() -> str:
    return getattr(settings, "LEGAL_DOCS_VERSION", "2026-09-10")
