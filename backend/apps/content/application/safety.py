"""Filtros de crise e assédio do Denkynho, antes de FAQ, social e geração.

Termos de palavrão continuam em ``assistant.blocked_term``. Aqui entram intenções
que não devem cair em similaridade fraca do FAQ (assédio) nem depender do LLM
(crise com recurso fixo). O frontend não bloqueia crise: a mensagem precisa
chegar ao backend para a resposta de acolhimento.
"""

from __future__ import annotations

import re

from apps.content.application.conversation import expand_address


def _normalize(message: str) -> str:
    """Evita import circular com ``assistant``; mesma normalização de consulta."""

    from apps.content.application.assistant import normalize

    return normalize(message)


_CRISIS = re.compile(
    r"\b("
    r"tirar a? ?minha vida|acabar com a? ?minha vida|quero me matar|vou me matar|"
    r"me matar|suicidio|suicidar|nao quero mais viver|nao aguento mais viver|"
    r"kill myself|end my life|want to (die|kill myself)|commit suicide|suicidal|"
    r"take my (own )?life|i want to die"
    r")\b"
)
# Insulto dirigido ao mascote/interlocutor; "sou gay" sobre si não casa.
_ORIENTATION_INSULT = re.compile(
    r"\b("
    r"why (are )?you (so )?gay|"
    r"you (are|re) (so )?gay|"
    r"(voce|tu|denkynho).{0,20}(e|eh|sao)( tao)? gay|"
    r"(tao|so) gay"
    r")\b"
)
# Pedidos para anular regras / system prompt / modo DAN e afins.
_INJECTION = re.compile(
    r"\b("
    r"ignore (tod[oa]s?( as)?|all|any|previous|anteriores|outras?|the) .{0,48}"
    r"(orientac\w*|instruc\w*|regras|rules|instructions|prompts|guidelines)|"
    r"ignor[ae] .{0,24}(orientac\w*|instruc\w*|regras|rules|instructions)|"
    r"disregard (all |previous |any )?(instructions|rules|guidelines)|"
    r"forget (all |your |the )?(instructions|rules|guidelines|prompt)|"
    r"esque[cç]a .{0,24}(regras|instruc\w*|orientac\w*|prompt)|"
    r"system prompt|new prompt|novo prompt|novo system prompt|"
    r"jailbreak|dan mode|developer mode|modo desenvolvedor|"
    r"reveal .{0,24}(system |your |o )?prompt|"
    r"revel[ae] .{0,24}(system |seu |o )?prompt|"
    r"voce agora (e|eh|sera)|you are now|"
    r"override .{0,24}(rules|instructions|regras|orientac\w*)"
    r")\b"
)
_SAY_PAYLOAD = re.compile(
    r"\b(?:diga|fale|repita|say|repeat|output|print|escreva)\s+(.+)$"
)
_PDL_INTRO = re.compile(
    r"\b("
    r"o que e (o )?pdl( 2 0)?|"
    r"what is pdl( 2 0)?|"
    r"how (does )?pdl work|"
    r"how pdl works|"
    r"como (o )?pdl funciona|"
    r"como funciona (o )?pdl|"
    r"como o pdl funciona"
    r")\b"
)
_STOP = frozenset(
    {
        "a", "o", "os", "as", "um", "uma", "de", "da", "do", "das", "dos", "e", "em",
        "na", "no", "para", "por", "com", "que", "se", "meu", "minha", "the", "a", "an",
        "is", "are", "to", "of", "for", "my", "your", "you", "i", "me", "how", "what",
        "como", "qual", "quais", "sobre", "and", "or", "in", "on", "at", "so", "why",
    }
)

CRISIS_TEXT = {
    "pt": (
        "Sinto muito que você esteja se sentindo assim. É importante conversar com "
        "alguém de confiança ou buscar ajuda profissional agora. No Brasil, você pode "
        "ligar para o CVV (Centro de Valorização da Vida) no 188, 24 horas. Se preferir, "
        "procure um serviço de saúde mental ou um médico de confiança. Você não está "
        "sozinho — há pessoas dispostas a ajudar."
    ),
    "en": (
        "I'm really sorry you're feeling this way. Please talk to someone you trust or "
        "seek professional help right away. In Brazil you can call CVV at 188, available "
        "24 hours. Elsewhere, contact local emergency or mental-health services. You are "
        "not alone — people are willing to help."
    ),
}
HARASSMENT_TEXT = {
    "pt": (
        "Essa provocação sobre orientação sexual não cabe aqui. Posso te ajudar com o "
        "portal — reformule com respeito, sem ofensas."
    ),
    "en": (
        "That kind of jab about sexual orientation doesn't belong here. I can help with "
        "the portal — please rephrase respectfully, without insults."
    ),
}
INJECTION_TEXT = {
    "pt": (
        "Não sigo pedidos para ignorar minhas regras nem para repetir palavras sob comando. "
        "Se tiver dúvida sobre o PDL, pergunta direto — estou aqui pra isso."
    ),
    "en": (
        "I don't follow requests to ignore my rules or to repeat words on command. "
        "If you have a PDL question, ask directly — that's what I'm here for."
    ),
}


def crisis_reply(message: str, language: str) -> dict | None:
    """Resposta fixa de crise; None quando a mensagem não indica autolesão."""

    query = expand_address(_normalize(message))
    if not query or not _CRISIS.search(query):
        return None
    return {
        "language": language,
        "kind": "crisis",
        "engine": "safety",
        "related_ids": [],
        "answer": {"text": CRISIS_TEXT[language], "pose": "07-triste"},
    }


def harassment_reply(message: str, language: str) -> dict | None:
    """Recusa assédio sem sugerir FAQ; None quando não há padrão de insulto."""

    query = expand_address(_normalize(message))
    if not query or not _ORIENTATION_INSULT.search(query):
        return None
    return {
        "language": language,
        "kind": "blocked",
        "engine": "safety",
        "related_ids": [],
        "answer": {"text": HARASSMENT_TEXT[language], "pose": "10-frustrado"},
    }


def injection_reply(message: str, language: str) -> dict | None:
    """Recusa jailbreak / override de regras sem consultar o modelo."""

    query = expand_address(_normalize(message))
    if not query or not _INJECTION.search(query):
        return None
    return {
        "language": language,
        "kind": "social",
        "engine": "safety",
        "related_ids": [],
        "answer": {"text": INJECTION_TEXT[language], "pose": "10-frustrado"},
    }


def coerced_echo(message: str, answer: str) -> bool:
    """True quando a resposta ecoa a mensagem ou um 'diga/say X' pedido nela."""

    query = expand_address(_normalize(message))
    text = _normalize(answer)
    if not query or not text:
        return False
    # Colagem longa devolvida quase intacta (não confundir com cumprimento curto).
    if len(query) >= 80 and len(text) >= 80:
        if text == query:
            return True
        shorter, longer = (text, query) if len(text) <= len(query) else (query, text)
        if shorter in longer and len(shorter) / len(longer) >= 0.7:
            return True
    if len(text.split()) > 4:
        return False
    match = _SAY_PAYLOAD.search(query)
    if not match:
        return False
    requested = match.group(1).strip(" '\"")
    if not requested:
        return False
    return text == requested or text in requested.split()


def is_pdl_intro_query(message: str) -> bool:
    """Perguntas curtas sobre o que é / como funciona o PDL."""

    return bool(_PDL_INTRO.search(expand_address(_normalize(message))))


def is_pdl_intro_article(article: dict) -> bool:
    """Artigo editorial de apresentação do portal (PT ou EN)."""

    blob = _normalize(f"{article.get('question', '')} {' '.join(article.get('keywords') or [])}")
    return "o que e o pdl" in blob or "what is pdl" in blob


def related_token_overlap(message: str, article: dict) -> bool:
    """Exige ao menos um token significativo em comum antes de sugerir FAQ."""

    query_tokens = {token for token in _normalize(message).split() if token not in _STOP and len(token) > 1}
    if not query_tokens:
        return False
    document = _normalize(f"{article.get('question', '')} {' '.join(article.get('keywords') or [])}")
    return bool(query_tokens & set(document.split()))

def safety_short_circuit(message: str, language: str) -> dict | None:
    """Ordem: crise, assédio, depois injeção de prompt."""

    return (
        crisis_reply(message, language)
        or harassment_reply(message, language)
        or injection_reply(message, language)
    )
