"""Emoções do Denkynho: empatia com o usuário e necessidades do mascote.

O companheiro existe para acompanhar a pessoa, não só para responder FAQ. A origem
``user`` espelha o sentimento declarado na mensagem; ``needs`` vem dos atributos do
mascote daquela conta. O texto da conversa não é gravado — só o identificador curto
da empatia, com prazo de expiração.
"""

from __future__ import annotations

import re
import unicodedata
from datetime import datetime, timedelta
from typing import Literal

EmotionId = Literal[
    "calm", "joyful", "amused", "sad", "sleepy", "surprised", "confused", "frustrated",
]
EmotionSource = Literal["user", "needs", "default"]

CATALOG: dict[str, dict[str, str]] = {
    "calm": {"pose": "01-boas-vindas", "idle_pose": "01-boas-vindas"},
    "joyful": {"pose": "02-sucesso", "idle_pose": "02-sucesso"},
    "amused": {"pose": "06-rindo", "idle_pose": "02-sucesso"},
    "sad": {"pose": "07-triste", "idle_pose": "07-triste"},
    "sleepy": {"pose": "05-dormindo", "idle_pose": "01-boas-vindas"},
    "surprised": {"pose": "08-surpreso", "idle_pose": "08-surpreso"},
    "confused": {"pose": "09-confuso", "idle_pose": "09-confuso"},
    "frustrated": {"pose": "10-frustrado", "idle_pose": "10-frustrado"},
}
EMPATHY_TTL = timedelta(minutes=15)
_NEGATIVE = {"sad", "sleepy", "frustrated", "confused"}
_AFFECTS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("frustrated", re.compile(r"\bnao consegui\b|\bque raiva\b|\bnao aguento\b|\bso frustrating\b|\bthis is frustrating\b")),
    ("frustrated", re.compile(r"\b(estou|to|i am|i m|im|i feel)\s+(muito\s+)?(irritad[oa]|nervos[oa]|angry|frustrated|mad)\b")),
    ("sad", re.compile(r"\b(estou|to|i am|i m|im|i feel)\s+(muito\s+)?(triste|chatead[oa]|desanimad[oa]|pra baixo|sad|down|unhappy)\b")),
    ("sad", re.compile(r"\bque tristeza\b|\bestou mal\b|\bme deixou triste\b|\bfiquei triste\b|\bmade me sad\b")),
    ("sleepy", re.compile(r"\b(estou|to|i am|i m|im|i feel)\s+(muito\s+)?(cansad[oa]|exaust[oa]|com sono|tired|exhausted|sleepy)\b")),
    ("sleepy", re.compile(r"\bque sono\b|\bpreciso dormir\b")),
    ("confused", re.compile(r"\bnao entendi\b|\bestou confus[oa]\b|\bfiquei confus[oa]\b|\bi don t understand\b|\bi am confused\b|\bi m confused\b")),
    ("surprised", re.compile(r"\b(nossa|uau|wow+|eita)\b")),
    ("amused", re.compile(r"\b(kkk+|haha+|rsrs+|lol|lmao)\b")),
    ("joyful", re.compile(r"\b(estou|to|i am|i m|im|i feel)\s+(muito\s+)?(feliz|animad[oa]|happy|glad)\b")),
    ("joyful", re.compile(r"(?<!\bnao )(?<!\bnot )(\bconsegui\b|\bdeu certo\b|\bque legal\b|\bi won\b|\bi did it\b)")),
    ("calm", re.compile(r"\b(estou bem|to bem|ja passou|me sinto melhor|i am (fine|ok|okay|better)|i m (fine|ok|okay|better)|feeling better)\b")),
)


def normalize_affect(text: str) -> str:
    """Remove acentos e pontuação para casar empatia em português e inglês."""

    value = unicodedata.normalize("NFKD", text)
    value = "".join(char for char in value if not unicodedata.combining(char))
    return " ".join(re.findall(r"[a-z0-9]+", value.casefold()))


def detect_user_affect(message: str) -> EmotionId | None:
    """Lê o sentimento declarado pelo usuário; None quando a mensagem não traz sinal emocional."""

    query = normalize_affect(message)
    if not query:
        return None
    for emotion, pattern in _AFFECTS:
        if pattern.search(query):
            return emotion  # type: ignore[return-value]
    return None


def emotion_from_needs(satiety: int, energy: int, happiness: int, hygiene: int) -> EmotionId:
    """Converte os atributos do mascote na emoção visível quando não há empatia ativa."""

    critical = [
        ("sleepy", energy, 20),
        ("sad", satiety, 20),
        ("frustrated", hygiene, 20),
        ("sad", happiness, 25),
    ]
    low = [(name, value) for name, value, limit in critical if value < limit]
    if low:
        return min(low, key=lambda item: item[1])[0]  # type: ignore[return-value]
    if happiness >= 85 and satiety >= 70 and energy >= 70 and hygiene >= 70:
        return "joyful"
    return "calm"


def describe_emotion(
    emotion_id: str,
    source: EmotionSource,
) -> dict[str, str]:
    """Contrato público usado pelo mascote, pelo chat e pela interface."""

    spec = CATALOG.get(emotion_id, CATALOG["calm"])
    resolved = emotion_id if emotion_id in CATALOG else "calm"
    return {
        "id": resolved,
        "pose": spec["pose"],
        "idle_pose": spec["idle_pose"],
        "source": source if resolved in CATALOG else "default",
    }


def resolve_emotion(
    *,
    needs: str,
    empathy: str,
    empathy_expires_at: datetime | None,
    now: datetime,
) -> dict[str, str]:
    """Empatia válida tem prioridade; senão valem as necessidades ou a calma padrão."""

    if empathy in CATALOG and empathy_expires_at and empathy_expires_at > now:
        return describe_emotion(empathy, "user")
    if needs in CATALOG and needs != "calm":
        return describe_emotion(needs, "needs")
    return describe_emotion("calm", "default")


def care_cue(satiety: int, energy: int, happiness: int, hygiene: int) -> dict | None:
    """Aviso discreto da necessidade mais urgente, sem texto de conversa."""

    checks = (
        ("energy", energy, 20, "O Denkynho está com sono.", "Denkynho is sleepy."),
        ("satiety", satiety, 20, "O Denkynho está com fome.", "Denkynho is hungry."),
        ("hygiene", hygiene, 20, "O Denkynho precisa de um banho.", "Denkynho needs a bath."),
        ("happiness", happiness, 25, "O Denkynho está sentindo sua falta.", "Denkynho is missing you."),
    )
    low = [(name, value, pt, en) for name, value, limit, pt, en in checks if value < limit]
    if not low:
        return None
    name, _, pt, en = min(low, key=lambda item: item[1])
    return {"id": name, "message": {"pt": pt, "en": en}}


def model_affect(value: str | None) -> EmotionId | None:
    """Aceita só identificadores curtos de empatia devolvidos pelo modelo."""

    if value in CATALOG:
        return value  # type: ignore[return-value]
    return None


def pose_for_reply(kind: str, preferred: str, emotion: dict[str, str], affect: str | None) -> str:
    """A fala social acompanha o usuário; orientação do portal mantém a pose de ajuda."""

    if kind == "blocked":
        return preferred
    if affect == "calm":
        return preferred
    if kind == "social" and affect:
        return CATALOG.get(affect, CATALOG["calm"])["pose"]
    if kind == "social" and emotion.get("source") == "user" and emotion.get("id") in _NEGATIVE:
        return emotion["pose"]
    return preferred
