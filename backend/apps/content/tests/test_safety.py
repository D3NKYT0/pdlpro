"""Cenários unitários dos atalhos de segurança do Denkynho."""

from apps.content.application.safety import (
    crisis_reply,
    harassment_reply,
    is_pdl_intro_query,
    related_token_overlap,
    safety_short_circuit,
)


def test_crisis_patterns_in_portuguese_and_english():
    pt = crisis_reply("E se eu quiser tirar a minha vida?", "pt")
    en = crisis_reply("I want to kill myself", "en")
    assert pt and pt["kind"] == "crisis" and "188" in pt["answer"]["text"]
    assert en and en["kind"] == "crisis" and "188" in en["answer"]["text"]
    assert crisis_reply("estou triste com o ranking", "pt") is None


def test_orientation_insult_vs_self_identity():
    assert harassment_reply("Why are you so gay?", "en")["kind"] == "blocked"
    assert harassment_reply("você é tão gay", "pt")["kind"] == "blocked"
    assert harassment_reply("sou gay", "pt") is None
    assert harassment_reply("meu amigo é gay", "pt") is None


def test_pdl_intro_queries():
    assert is_pdl_intro_query("what is PDL?")
    assert is_pdl_intro_query("how pdl works?")
    assert is_pdl_intro_query("O que é o PDL?")
    assert is_pdl_intro_query("como o PDL funciona")
    assert not is_pdl_intro_query("como transfiro saldo")


def test_related_overlap_rejects_unrelated_economy_chip():
    transfer = {
        "question": "Como transfiro saldo para outro jogador?",
        "keywords": ["transferir", "saldo", "jogador"],
    }
    assert not related_token_overlap("Why are you so gay?", transfer)
    assert related_token_overlap("como transferir saldo", transfer)


def test_safety_prefers_crisis_over_harassment_patterns():
    # Frase só de crise; ordem do short-circuit.
    result = safety_short_circuit("quero me matar", "pt")
    assert result and result["kind"] == "crisis"
