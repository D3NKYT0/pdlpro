"""Intenções sociais concorrentes ao FAQ e reparação explícita de entendimento."""
import re

from rapidfuzz.fuzz import ratio

IDENTITY_EXAMPLES = {
    'pt': ('me fale sobre voce', 'fale um pouco sobre voce', 'quem e voce', 'quero conhecer melhor voce', 'me conte sobre voce', 'se apresente'),
    'en': ('tell me about yourself', 'who are you', 'introduce yourself', 'i want to know more about you'),
}
IDENTITY_TEXT = {
    'pt': 'Eu sou o Denkynho, o assistente virtual do PDL 2.0! Gosto de explicar as coisas com calma, dar uma força quando surge uma dúvida e comemorar suas conquistas. Posso conversar com você e orientar sobre o portal. Sou um personagem virtual: não tenho uma vida fora daqui e não executo ações na sua conta.',
    'en': "I'm Denkynho, the PDL 2.0 virtual assistant! I like explaining things patiently, helping with questions, and celebrating your achievements. I can chat with you and guide you around the portal. I'm a virtual character: I don't have a life outside this app or perform actions on your account.",
}


def correction_requested(query: str) -> bool:
    """Identifica rejeição da interpretação, sem tratá-la como falha de uma operação."""
    return bool(re.search(r'\b(nao foi isso|nao e isso|nao perguntei|eu pedi|eu perguntei|voce entendeu errado|i asked|not what i asked|you misunderstood)\b', query))


def explicit_identity(query: str) -> bool:
    """Reconhece apresentação dirigida ao assistente, tolerando abreviações e erros leves."""
    query = re.sub(r'\b(vc|vce)\b', 'voce', query)
    if re.search(r'\b(meu|minha|my|jogo|game|conta|account|personagens|characters)\b', query):
        return False
    if re.search(r'\b(sobre (voce|si mesmo)|about yourself|conhecer (melhor )?voce)\b', query):
        return True
    return any(ratio(query, example) >= 88 for examples in IDENTITY_EXAMPLES.values() for example in examples)


def identity_reply(language: str, correction: bool = False) -> dict:
    """Resposta editorial sobre o personagem, sem fonte de FAQ nem ação externa."""
    prefix = ('Desculpa, interpretei errado. Você queria saber sobre mim. ' if language == 'pt'
              else 'Sorry, I misunderstood. You wanted to know about me. ') if correction else ''
    return {'text': prefix + IDENTITY_TEXT[language], 'pose': '01-boas-vindas'}


def social_articles(language: str) -> list[dict]:
    """Exemplos de apresentação usados pelo mesmo modelo semântico que busca o FAQ."""
    return [{'id': 'social:identity', 'question': example, 'keywords': [], 'short_answer': IDENTITY_TEXT[language],
             'answer': IDENTITY_TEXT[language], 'kind': 'social'} for example in IDENTITY_EXAMPLES[language]]
