from __future__ import annotations

import logging
import math
import re
import unicodedata
from abc import ABC, abstractmethod
from dataclasses import dataclass

from common.architecture.base import UseCase
from lingua import Language, LanguageDetectorBuilder
from rapidfuzz.fuzz import WRatio

from apps.content.application.conversation import (
    correction_requested,
    explicit_identity,
    identity_reply,
    social_articles,
)
from apps.content.application.use_cases import ListFaqInput, ListFaqUseCase

logger = logging.getLogger(__name__)
SUPPORTED_LANGUAGES = {"pt", "en"}
LANGUAGE_DETECTOR = LanguageDetectorBuilder.from_languages(
    Language.PORTUGUESE,
    Language.ENGLISH,
).build()
BLOCKED = {
    "pt": {"rola", "caralho", "cacete", "porra", "buceta", "xoxota", "piroca", "merda", "pau", "puta", "puto", "viado", "veado", "bicha", "foder", "foda", "cu", "nazista"},
    "en": {"dick", "cock", "pussy", "motherfucker", "nigger", "cunt"},
}
LEET = str.maketrans(
    {"0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i"}
)


class SemanticMatcher(ABC):
    """Porta para comparar uma mensagem com textos usando embeddings multilíngues."""

    def available(self) -> bool:
        """Informa se esta implantação pode carregar o modelo de embeddings."""

        return True

    @abstractmethod
    def similarities(self, query: str, documents: list[str]) -> list[float]:
        """Devolve uma similaridade entre zero e um para cada documento."""


def normalize(text: str) -> str:
    value = unicodedata.normalize("NFKD", text.translate(LEET))
    value = "".join(
        char
        for char in value
        if not unicodedata.combining(char) and char not in "\u200b\u200c\u200d\u2060\ufeff"
    )
    return " ".join(re.findall(r"[a-z0-9]+", value.casefold()))


def detect_language(text: str, preferred: str = "auto") -> str:
    """Detecta português ou inglês com Lingua; entradas ambíguas preservam o padrão PT."""

    if preferred in SUPPORTED_LANGUAGES:
        return preferred
    detected = LANGUAGE_DETECTOR.detect_language_of(text)
    return "en" if detected == Language.ENGLISH else "pt"


def blocked_term(text: str) -> str | None:
    value = normalize(text)
    for terms in BLOCKED.values():
        for term in terms:
            pattern = r"(?:^|\s)" + r"\s*".join(f"{re.escape(char)}+" for char in term) + r"(?:\s|$)"
            if re.search(pattern, value):
                return term
    return None


@dataclass(frozen=True, slots=True)
class AssistantReplyInput:
    message: str
    audience: str
    language: str = "auto"


class AssistantReplyUseCase(UseCase[AssistantReplyInput, dict]):
    """Interpreta PT/EN e consulta somente artigos permitidos para a audiência recebida."""

    def __init__(self, semantic_matcher: SemanticMatcher) -> None:
        self._semantic_matcher = semantic_matcher

    def execute(self, data: AssistantReplyInput) -> dict:
        language = detect_language(data.message, data.language)
        if blocked_term(data.message):
            text = (
                "I can't use that language here. Please rephrase your message respectfully."
                if language == "en"
                else "Essa linguagem não pode ser usada aqui. Reformule a mensagem de modo respeitoso."
            )
            return {
                "language": language,
                "kind": "blocked",
                "engine": "moderation",
                "answer": {"text": text, "pose": "10-frustrado"},
            }

        query = normalize(data.message)
        correction = correction_requested(query)
        if explicit_identity(query):
            return {"language": language, "kind": "social", "engine": "rapidfuzz", "answer": identity_reply(language, correction)}
        if correction:
            text = ("Desculpa, interpretei sua pergunta errado. Qual era o assunto que você queria conversar?"
                    if language == "pt" else "Sorry, I misunderstood your question. What did you want to talk about?")
            return {"language": language, "kind": "unknown", "engine": "conversation", "related_ids": [], "answer": {"text": text, "pose": "09-confuso"}}
        articles = ListFaqUseCase().execute(
            ListFaqInput(audience=data.audience, language=language, for_assistant=True)
        )
        articles += social_articles(language)
        documents = [f"{article['question']} {' '.join(article['keywords'])}" for article in articles]
        engine = "sentence-transformers+rapidfuzz"
        semantic_scores: list[float]
        if not self._semantic_matcher.available():
            semantic_scores = [0.0] * len(documents)
            engine = "rapidfuzz"
        else:
            try:
                semantic_scores = self._semantic_matcher.similarities(data.message, documents)
                if len(semantic_scores) != len(documents) or any(not math.isfinite(score) for score in semantic_scores):
                    raise ValueError("semantic matcher returned an invalid score count")
            except Exception:
                logger.exception("Denkynho semantic matching failed; using RapidFuzz only")
                semantic_scores = [0.0] * len(documents)
                engine = "rapidfuzz"

        ranked = []
        for article, semantic in zip(articles, semantic_scores, strict=True):
            document = f"{article['question']} {' '.join(article['keywords'])}"
            lexical = WRatio(normalize(data.message), normalize(document)) / 100
            score = lexical if engine == "rapidfuzz" else max(0.0, semantic) * 0.82 + lexical * 0.18
            ranked.append((score, article))
        # Vários exemplos da mesma intenção não competem entre si pela margem.
        grouped = {}
        for score, article in ranked:
            if article['id'] not in grouped or score > grouped[article['id']][0]:
                grouped[article['id']] = (score, article)
        ranked = sorted(grouped.values(), key=lambda item: item[0], reverse=True)
        best_score, best = ranked[0] if ranked else (0.0, None)
        second_score = ranked[1][0] if len(ranked) > 1 else 0.0
        threshold = 0.86 if engine == "rapidfuzz" else 0.50
        if best and best_score >= threshold and best_score - second_score >= 0.06:
            if best.get('kind') == 'social':
                return {"language": language, "kind": "social", "engine": engine, "confidence": round(best_score, 4), "answer": identity_reply(language)}
            return {
                "language": language,
                "kind": "knowledge",
                "engine": engine,
                "confidence": round(best_score, 4),
                "article_id": best["id"],
                "answer": {
                    "text": best["short_answer"] or best["answer"],
                    "details": best["answer"] if best["short_answer"] != best["answer"] else None,
                    "source": best["question"],
                    "pose": "04-dica",
                },
            }
        text = (
            "I found related topics, but I need a little more detail to answer safely."
            if language == "en"
            else "Encontrei assuntos relacionados, mas preciso de um pouco mais de detalhe para responder com segurança."
        )
        related = [article["id"] for score, article in ranked[:3] if score >= 0.40 and article.get('kind') != 'social']
        return {
            "language": language,
            "kind": "unknown",
            "engine": engine,
            "confidence": round(best_score, 4),
            "related_ids": related,
            "answer": {"text": text, "pose": "09-confuso"},
        }
