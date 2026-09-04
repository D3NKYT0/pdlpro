from __future__ import annotations

from threading import Lock
from typing import Any

from django.conf import settings

from apps.content.application.assistant import SemanticMatcher


class SentenceTransformerMatcher(SemanticMatcher):
    """Carrega sob demanda o modelo multilíngue e reutiliza-o entre requisições."""

    def __init__(self) -> None:
        self._model: Any | None = None
        self._lock = Lock()

    def available(self) -> bool:
        return settings.DENKYNHO_EMBEDDINGS_ENABLED

    def _get_model(self) -> Any:
        if not self.available():
            raise RuntimeError("Denkynho embeddings are disabled")
        if self._model is None:
            with self._lock:
                if self._model is None:
                    from sentence_transformers import SentenceTransformer

                    self._model = SentenceTransformer(settings.DENKYNHO_EMBEDDING_MODEL)
        return self._model

    def similarities(self, query: str, documents: list[str]) -> list[float]:
        if not documents:
            return []
        embeddings = self._get_model().encode(
            [query, *documents], normalize_embeddings=True, convert_to_numpy=True
        )
        query_embedding = embeddings[0]
        return [float(query_embedding @ document) for document in embeddings[1:]]
