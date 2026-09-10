"""Casos de uso e registro dos documentos legais públicos."""

from __future__ import annotations

from dataclasses import dataclass

from common.architecture.base import UseCase
from common.architecture.exceptions import EntityNotFoundError
from common.i18n import resolve_language

from .documents_en import DOCUMENTS_EN
from .documents_es import DOCUMENTS_ES
from .documents_pt import DOCUMENTS_PT
from .identity import identity_placeholders
from .versions import LEGAL_DOCS_HISTORY, current_legal_docs_version

DOCUMENT_ORDER = ("terms", "privacy", "agreement", "cookies", "lgpd")

_BY_LANGUAGE = {
    "pt": DOCUMENTS_PT,
    "en": DOCUMENTS_EN,
    "es": DOCUMENTS_ES,
}


def _document_copy(slug: str, language: str) -> dict[str, str]:
    language = resolve_language(language)
    catalog = _BY_LANGUAGE.get(language) or DOCUMENTS_PT
    item = catalog.get(slug) or DOCUMENTS_PT.get(slug)
    if item is None:
        raise EntityNotFoundError("Documento legal não encontrado.")
    placeholders = identity_placeholders()
    return {
        "title": item["title"],
        "body": item["body"].format(**placeholders).strip(),
    }


@dataclass(frozen=True, slots=True)
class LegalDocument:
    """Documento legal identificado por slug, com título, conteúdo e versão de aceite.

    É um objeto de dados; não carrega métodos de persistência do ORM. Consulte os campos tipados
    abaixo ao montar ou consumir o resultado.
    """

    slug: str
    title: str
    body: str
    version: str
    language: str = "pt"
    format: str = "html"


@dataclass(frozen=True, slots=True)
class ListLegalDocumentsInput:
    """Idioma opcional para listar títulos dos documentos legais."""

    language: str = "pt"


@dataclass(frozen=True, slots=True)
class GetLegalDocumentInput:
    """Slug e idioma do documento legal solicitado."""

    slug: str
    language: str = "pt"


@dataclass(frozen=True, slots=True)
class ListLegalHistoryInput:
    """Idioma opcional para o histórico público de versões."""

    language: str = "pt"


class ListLegalDocumentsUseCase(UseCase[ListLegalDocumentsInput | None, dict]):
    """Lista slugs e títulos dos documentos legais junto da versão configurada.

    Uso: resolva pelo container e chame ``execute(data)`` com ``ListLegalDocumentsInput`` ou ``None``.
    O retorno é ``dict``.
    """

    def execute(self, data: ListLegalDocumentsInput | None = None) -> dict:
        language = resolve_language(data.language if data else "pt")
        version = current_legal_docs_version()
        return {
            "version": version,
            "language": language,
            "documents": [
                {"slug": slug, "title": _document_copy(slug, language)["title"]}
                for slug in DOCUMENT_ORDER
            ],
        }


class GetLegalDocumentUseCase(UseCase[GetLegalDocumentInput | str, LegalDocument]):
    """Obtém o documento legal pelo slug normalizado, incluindo conteúdo e versão.

    Uso: resolva pelo container e chame ``execute(data)`` com ``GetLegalDocumentInput`` ou ``str``.
    O retorno é ``LegalDocument``.
    """

    def execute(self, data: GetLegalDocumentInput | str) -> LegalDocument:
        if isinstance(data, str):
            slug = data
            language = "pt"
        else:
            slug = data.slug
            language = data.language
        slug = (slug or "").strip().lower()
        language = resolve_language(language)
        if slug not in DOCUMENT_ORDER:
            raise EntityNotFoundError("Documento legal não encontrado.")
        copy = _document_copy(slug, language)
        return LegalDocument(
            slug=slug,
            title=copy["title"],
            body=copy["body"],
            version=current_legal_docs_version(),
            language=language,
            format="html",
        )


class ListLegalHistoryUseCase(UseCase[ListLegalHistoryInput | None, dict]):
    """Lista o histórico público de versões dos documentos legais.

    Uso: resolva pelo container e chame ``execute(data)`` com ``ListLegalHistoryInput`` ou ``None``.
    O retorno é ``dict``.
    """

    def execute(self, data: ListLegalHistoryInput | None = None) -> dict:
        language = resolve_language(data.language if data else "pt")
        current = current_legal_docs_version()
        entries = []
        for entry in LEGAL_DOCS_HISTORY:
            entries.append(
                {
                    "version": entry.version,
                    "effective_from": entry.effective_from,
                    "effective_until": entry.effective_until,
                    "title": entry.title,
                    "is_current": entry.version == current,
                    "changes": [
                        {"area": change.area, "reason": change.reason}
                        for change in entry.changes
                    ],
                }
            )
        return {
            "version": current,
            "language": language,
            "history": entries,
        }
