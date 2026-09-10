"""Documentos legais públicos do portal (API de content)."""

from .service import (
    GetLegalDocumentInput,
    GetLegalDocumentUseCase,
    LegalDocument,
    ListLegalDocumentsInput,
    ListLegalDocumentsUseCase,
    ListLegalHistoryInput,
    ListLegalHistoryUseCase,
)

__all__ = [
    "GetLegalDocumentInput",
    "GetLegalDocumentUseCase",
    "LegalDocument",
    "ListLegalDocumentsInput",
    "ListLegalDocumentsUseCase",
    "ListLegalHistoryInput",
    "ListLegalHistoryUseCase",
]
