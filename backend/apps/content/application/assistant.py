from __future__ import annotations

import logging
import math
import re
import unicodedata
from abc import ABC, abstractmethod
from dataclasses import dataclass
from functools import cache

from lingua import Language, LanguageDetectorBuilder
from rapidfuzz.fuzz import WRatio

from apps.content.application.conversation import (
    allows_semantic_social,
    correction_requested,
    hurt_reaction_reply,
    identity_reply,
    laugh_reaction_reply,
    self_talk_reply,
    social_articles,
)
from apps.content.application.safety import (
    is_pdl_intro_article,
    is_pdl_intro_query,
    related_token_overlap,
    safety_short_circuit,
)
from apps.content.application.use_cases import ListFaqInput, ListFaqUseCase
from common.architecture.base import UseCase

logger = logging.getLogger(__name__)
SUPPORTED_LANGUAGES = {"pt", "en", "es"}
LANGUAGE_DETECTOR = LanguageDetectorBuilder.from_languages(
    Language.PORTUGUESE,
    Language.ENGLISH,
    Language.SPANISH,
).build()
BLOCKED = {
    # Vocabulário curado a partir do filtro do CARDGAME. Termos de crise e
    # autolesão ficam fora: precisam alcançar ``safety.crisis_reply``.
    "pt": {
        "aleijada", "aleijado", "arrombada", "arrombadas", "arrombado", "arrombados",
        "babaca", "baitola", "bicha", "bichinha", "bichona", "biscate", "boquete",
        "bosta", "bostinha", "buceta", "bucetao", "bucetinha", "bundao", "burra",
        "burro", "cacete", "cacetao", "canalha", "carai", "caraio", "caralhao",
        "caralho", "caralhos", "crioula", "crioulo", "crl", "cu", "cuzao",
        "desgraca", "desgracada", "desgracadas", "desgracado", "desgracados", "dildo",
        "estupro", "estuprada", "estuprador", "estuprar", "fdp", "feminazi", "foda",
        "fodase", "fodendo", "foder", "fodida", "fodido", "fracassada", "fracassado",
        "fudendo", "fuder", "fudida", "fudido", "gozada", "gozando", "gozar", "gozei",
        "gozou", "imbecil", "incesto", "krl", "krll", "macaca", "macacada", "macaco",
        "mamaca", "mamaco", "mamada", "mamando", "mamar", "marica", "masturbacao",
        "masturbar", "merda", "merdinha", "mongoloide", "mulambo", "nazismo", "nazista",
        "necrofilia", "neonazi", "nude", "nudes", "nojenta", "nojento", "orgasmo",
        "otaria", "otario", "pau", "pedofila", "pedofilia", "pedofilo", "pica", "pika",
        "piranha", "piroca", "pnc", "porno", "pornografia", "pornografica",
        "pornografico", "porra", "porraloka", "porralouca", "porreta", "pqp", "punheta",
        "punheteiro", "puta", "putaria", "puteiro", "putinha", "puto", "quenga",
        "retardada", "retardado", "rola", "roluda", "roludo", "safada", "safado",
        "sapatao", "sapatona", "siririca", "tarada", "tarado", "tesao", "tnc", "transar",
        "transando", "traveco", "trepada", "trepando", "trepar", "vadia", "vagabunda",
        "vagabundo", "veado", "viado", "viadinho", "vibrador", "vsf", "vtnc", "xaninha",
        "xhamster", "xota", "xoxota", "xvideos", "zoofilia",
    },
    "en": {
        "arse", "arsehole", "asshat", "asshole", "assholes", "bastard", "bastards",
        "bitch", "bitches", "bitchy", "blowjob", "bollocks", "boobies", "boobs",
        "brothel", "bugger", "bullshit", "cocksucker", "cock", "crap", "crappy", "cunt",
        "dammit", "damn", "damned", "dick", "dickhead", "dildo", "douche", "douchebag",
        "dumbass", "dumbfuck", "dyke", "fag", "faggot", "faggots", "fags", "fml", "fuck",
        "fucker", "fucking", "gangbang", "gtfo", "handjob", "hentai", "hooker", "incest",
        "jackass", "jackoff", "jerkoff", "jizz", "kike", "kys", "masturbate",
        "masturbating", "masturbation", "molest", "molestation", "molester", "motherfucker",
        "muthafucka", "nazi", "nazis", "necrophilia", "nigga", "niggas", "nigger",
        "niggers", "nipple", "nipples", "nsfw", "nude", "nudity", "omfg", "orgasm",
        "orgasms", "orgy", "paedophile", "pedophile", "pedophilia", "penis", "piss",
        "pissed", "pissing", "porn", "pornhub", "pornographic", "pornography", "prostitute",
        "prostitution", "pussy", "pussies", "rape", "raped", "raping", "rapist", "retard",
        "retarded", "retards", "scumbag", "semen", "sexcam", "sexting", "shit", "shitbag",
        "shitface", "shithead", "shitty", "slut", "slutty", "spaz", "sperm", "stfu",
        "stripper", "thot", "tits", "titties", "titty", "tosser", "tranny", "twat",
        "wank", "wanker", "wanking", "whore", "wtf", "xhamster", "xnxx", "xvideos",
        "youporn", "zoophilia",
    },
    "es": {
        "cabron", "cabrones", "cojones", "coño", "culero", "gilipollas", "hijoputa",
        "idiota", "imbecil", "joder", "jolines", "mamada", "maricón", "maricon", "mierda",
        "ojete", "pendejo", "pendeja", "polla", "puta", "puto", "putas", "puto", "verga",
        "zorra", "zoofilia", "estupro", "violacion", "violador", "pedofilo", "pedofilia",
        "porno", "pornografia", "nazi", "nazis", "retrasado", "retrasada",
    },
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


def lexical_similarity(query: str, document: str) -> float:
    """Compara texto normalizado para FAQ e fontes do chat quando não há embeddings."""

    return WRatio(normalize(query), normalize(document)) / 100


def valid_preferred_name(value: str) -> bool:
    """Aceita um nome curto ou vazio para esquecer a preferência, sem instruções ou ofensas."""

    return not value or bool(
        len(value) <= 30
        and not blocked_term(value)
        and re.fullmatch(r"[^\W\d_]+(?:[ '\-][^\W\d_]+)*", value)
    )


def detect_language(text: str, preferred: str = "auto") -> str:
    """Detecta português, inglês ou espanhol com Lingua; entradas ambíguas preservam o padrão PT."""

    if preferred in SUPPORTED_LANGUAGES:
        return preferred
    detected = LANGUAGE_DETECTOR.detect_language_of(text)
    if detected == Language.ENGLISH:
        return "en"
    if detected == Language.SPANISH:
        return "es"
    return "pt"


@cache
def _blocked_pattern(term: str) -> re.Pattern[str]:
    """Compila uma vez o padrão anti-bypass de cada termo curado."""

    pattern = r"(?:^|\s)" + r"\s*".join(f"{re.escape(char)}+" for char in term) + r"(?:\s|$)"
    return re.compile(pattern)


def blocked_term(text: str) -> str | None:
    value = normalize(text)
    for terms in BLOCKED.values():
        for term in terms:
            if _blocked_pattern(term).search(value):
                return term
    return None


@dataclass(frozen=True, slots=True)
class AssistantReplyInput:
    message: str
    audience: str
    language: str = "auto"


class AssistantReplyUseCase(UseCase[AssistantReplyInput, dict]):
    """Interpreta PT/EN/ES e consulta somente artigos permitidos para a audiência recebida."""

    def __init__(
        self,
        semantic_matcher: SemanticMatcher,
        list_faq: ListFaqUseCase,
    ) -> None:
        self._semantic_matcher = semantic_matcher
        self._list_faq = list_faq

    def execute(self, data: AssistantReplyInput) -> dict:
        language = detect_language(data.message, data.language)
        if blocked_term(data.message):
            blocked_messages = {
                "en": "I can't use that language here. Please rephrase your message respectfully.",
                "es": "Ese lenguaje no se puede usar aquí. Reformule el mensaje de forma respetuosa.",
                "pt": "Essa linguagem não pode ser usada aqui. Reformule a mensagem de modo respeitoso.",
            }
            text = blocked_messages.get(language, blocked_messages["pt"])
            return {
                "language": language,
                "kind": "blocked",
                "engine": "moderation",
                "related_ids": [],
                "answer": {"text": text, "pose": "10-frustrado"},
            }
        safe = safety_short_circuit(data.message, language)
        if safe:
            return safe

        query = normalize(data.message)
        correction = correction_requested(query)
        about_self = self_talk_reply(query, language, correction)
        if about_self:
            return {"language": language, "kind": "social", "engine": "rapidfuzz", "answer": about_self}
        hurt = hurt_reaction_reply(query, language)
        if hurt:
            return {"language": language, "kind": "social", "engine": "rapidfuzz", "answer": hurt}
        laugh = laugh_reaction_reply(query, language)
        if laugh:
            return {"language": language, "kind": "social", "engine": "rapidfuzz", "answer": laugh}
        if correction:
            correction_messages = {
                "pt": "Desculpa, interpretei sua pergunta errado. Qual era o assunto que você queria conversar?",
                "en": "Sorry, I misunderstood your question. What did you want to talk about?",
                "es": "Perdón, interpreté mal tu pregunta. ¿Sobre qué querías hablar?",
            }
            text = correction_messages.get(language, correction_messages["pt"])
            return {"language": language, "kind": "unknown", "engine": "conversation", "related_ids": [], "answer": {"text": text, "pose": "09-confuso"}}
        articles = self._list_faq.execute(
            ListFaqInput(audience=data.audience, language=language, for_assistant=True)
        )
        if is_pdl_intro_query(data.message):
            intro = next((article for article in articles if is_pdl_intro_article(article)), None)
            if intro:
                return {
                    "language": language,
                    "kind": "knowledge",
                    "engine": "safety",
                    "confidence": 1.0,
                    "article_id": intro["id"],
                    "answer": {
                        "text": intro["short_answer"] or intro["answer"],
                        "details": intro["answer"] if intro["short_answer"] != intro["answer"] else None,
                        "source": intro["question"],
                        "pose": "04-dica",
                    },
                }
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
            lexical = lexical_similarity(data.message, document)
            score = lexical if engine == "rapidfuzz" else max(0.0, semantic) * 0.82 + lexical * 0.18
            ranked.append((score, article))
        # Vários exemplos da mesma intenção não competem entre si pela margem.
        grouped = {}
        for score, article in ranked:
            if article['id'] not in grouped or score > grouped[article['id']][0]:
                grouped[article['id']] = (score, article)
        ranked = sorted(grouped.values(), key=lambda item: item[0], reverse=True)
        ranked = [
            (score, article) for score, article in ranked
            if article.get('kind') != 'social' or allows_semantic_social(query, article.get('intent', 'identity'))
        ]
        best_score, best = ranked[0] if ranked else (0.0, None)
        second_score = ranked[1][0] if len(ranked) > 1 else 0.0
        threshold = 0.86 if engine == "rapidfuzz" else 0.50
        if best and best_score >= threshold and best_score - second_score >= 0.06:
            if best.get('kind') == 'social':
                intent = best.get('intent', 'identity')
                return {"language": language, "kind": "social", "engine": engine, "confidence": round(best_score, 4),
                        "answer": identity_reply(language, intent=intent)}
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
        unknown_messages = {
            "en": "I found related topics, but I need a little more detail to answer safely.",
            "es": "Encontré temas relacionados, pero necesito un poco más de detalle para responder con seguridad.",
            "pt": "Encontrei assuntos relacionados, mas preciso de um pouco mais de detalhe para responder com segurança.",
        }
        text = unknown_messages.get(language, unknown_messages["pt"])
        related_floor = 0.55 if engine == "rapidfuzz" else 0.45
        related = [
            article["id"]
            for score, article in ranked[:3]
            if score >= related_floor
            and article.get("kind") != "social"
            and related_token_overlap(data.message, article)
        ]
        return {
            "language": language,
            "kind": "unknown",
            "engine": engine,
            "confidence": round(best_score, 4),
            "related_ids": related,
            "answer": {"text": text, "pose": "09-confuso"},
        }
