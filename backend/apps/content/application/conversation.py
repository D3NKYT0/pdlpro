"""Intenções sociais concorrentes ao FAQ e reparação explícita de entendimento."""
import re

from rapidfuzz.fuzz import ratio

IDENTITY_EXAMPLES = {
    'pt': ('me fale sobre voce', 'fale um pouco sobre voce', 'quem e voce', 'quero conhecer melhor voce', 'me conte sobre voce', 'se apresente'),
    'en': ('tell me about yourself', 'who are you', 'introduce yourself', 'i want to know more about you'),
}
CREATOR_EXAMPLES = {
    'pt': ('quem te criou', 'quem criou voce', 'quem e denky', 'me fale sobre seu criador', 'quero conhecer seu criador'),
    'en': ('who created you', 'who is denky', 'tell me about your creator', 'i want to know your creator'),
}
APPEARANCE_EXAMPLES = {
    'pt': ('como voce e', 'como voce se parece', 'qual e a sua aparencia', 'o que voce veste'),
    'en': ('how do you look', 'what do you look like', 'describe your appearance', 'what are you wearing'),
}
APPEARANCE_TEASE_EXAMPLES = {
    'pt': ('voce e feio', 'vc e feio', 'voce e esquisito', 'voce parece estranho'),
    'en': ('you are ugly', 'you look ugly', 'you look weird', 'you re ugly'),
}
APPEARANCE_COMPLIMENT_EXAMPLES = {
    'pt': ('voce e bonito', 'voce e fofo', 'gosto da sua gravata', 'sua gravata e legal'),
    'en': ('you are cute', 'you look nice', 'i like your tie', 'nice tie'),
}
IDENTITY_TEXT = {
    'pt': 'Eu sou o Denkynho, seu companheiro virtual no PDL 2.0. Nasci do jeito de pensar do Denky, meu criador: curioso, mão na massa e acostumado a enxergar a jornada inteira, da arquitetura ao mundo em produção. Transformo isso em ajuda clara, companhia e comemoração para cada conquista. Sou um personagem virtual e não acesso nem executo ações na sua conta.',
    'en': "I'm Denkynho, your virtual companion in PDL 2.0. I grew out of how my creator Denky thinks: curious, hands-on, and used to seeing the whole journey from architecture to production. I turn that spirit into clear guidance, companionship, and a celebration for every achievement. I'm a virtual character and cannot access or perform actions on your account.",
}
CREATOR_TEXT = {
    'pt': 'Meu criador é o Denky, profissional de tecnologia que atua como arquiteto de sistemas, tech lead e desenvolvedor sênior. Ele combina Python, Django, FastAPI, JavaScript e React com bancos de dados, infraestrutura Linux, redes e virtualização para construir e conduzir produtos da arquitetura ao deploy. Eu sou o alter ego que traz esse lado curioso, estratégico e jogador para dentro do PDL. Se quiser conhecê-lo melhor, visite o portfólio.',
    'en': 'My creator is Denky, a technology professional working as a systems architect, tech lead, and senior developer. He combines Python, Django, FastAPI, JavaScript, and React with databases, Linux infrastructure, networking, and virtualization to lead products from architecture to deployment. I am the alter ego that brings his curious, strategic, gamer side into PDL. Visit his portfolio if you would like to know him better.',
}
CREATOR_PORTFOLIO_ACTION = {
    'pt': {'label': 'Conhecer o criador', 'url': 'https://denky.dev.br/'},
    'en': {'label': 'Meet my creator', 'url': 'https://denky.dev.br/'},
}
APPEARANCE_TEXT = {
    'pt': 'Sou um mascote virtual: cabelo escuro, camisa preta e gravata azul. Não tenho um corpo fora da tela, mas essa é a cara com a qual te acompanho no PDL.',
    'en': "I'm a virtual mascot: dark hair, a black shirt and a blue tie. I don't have a body outside this screen, but that's the look I wear while I keep you company in PDL.",
}
APPEARANCE_TEASE_TEXT = {
    'pt': 'Feio? Ai, essa doeu um pouquinho! Eu me esforço com esta gravata azul. Sou um personagem virtual: minha missão é te acompanhar, não aparecer na capa de uma revista.',
    'en': "Ugly? Ouch, that stung a little! I do try with this blue tie. I'm a virtual character: I'm here to keep you company, not to win a beauty contest.",
}
APPEARANCE_COMPLIMENT_TEXT = {
    'pt': 'Obrigado! A camisa preta e a gravata azul são a minha marca. Fico feliz que tenha gostado — estou aqui para te acompanhar no PDL.',
    'en': "Thanks! The black shirt and blue tie are my signature. I'm glad you like them — I'm here to keep you company in PDL.",
}
_ACCOUNT = re.compile(
    r'\b(meu|minha|meus|minhas|my|jogo|game|conta|account|personagem|personagens|character|characters'
    r'|perfil|avatar|senha|password|saldo|carteira|wallet)\b'
)
_LOOKS_TEASE = re.compile(
    r'\b(voce|tu|denkynho|you).{0,24}\b(feio|feia|feinho|esquisito|esquisita|estranho|estranha'
    r'|ridiculo|ridicula|horrivel|horroroso|horrorosa|bizarro|bizarra|ugly|weird|hideous)\b'
)
_LOOKS_COMPLIMENT = re.compile(
    r'\b(voce|tu|denkynho|you).{0,24}\b(bonito|bonita|lindo|linda|fofo|fofa|gato|gata'
    r'|elegante|estiloso|estilosa|cute|handsome|pretty|adorable|gorgeous)\b'
)
_LOOKS_ITEM = re.compile(
    r'\b(gosto d[ao]s? (sua|teu|your)|sua|teu|your|nice|belo|bela)\b.{0,16}\b'
    r'(gravata|cabelo|camisa|roupa|aparencia|visual|tie|hair|shirt|look)\b'
)
_LOOKS_QUESTION = re.compile(
    r'\b((como|qual) (e )?a? ?(sua |your )?(aparencia|cara|visual)|como voce (e|se parece)'
    r'|o que voce (veste|usa|tem na cara)|how do you look|what do you look like'
    r'|what are you wearing|describe (your )?(look|appearance))\b'
)
_REPLIES = {
    'identity': (IDENTITY_TEXT, '01-boas-vindas'),
    'creator': (CREATOR_TEXT, '04-dica'),
    'appearance': (APPEARANCE_TEXT, '01-boas-vindas'),
    'appearance_tease': (APPEARANCE_TEASE_TEXT, '08-surpreso'),
    'appearance_compliment': (APPEARANCE_COMPLIMENT_TEXT, '06-rindo'),
}
_SOCIAL_EXAMPLES = {
    'identity': IDENTITY_EXAMPLES,
    'creator': CREATOR_EXAMPLES,
    'appearance': APPEARANCE_EXAMPLES,
    'appearance_tease': APPEARANCE_TEASE_EXAMPLES,
    'appearance_compliment': APPEARANCE_COMPLIMENT_EXAMPLES,
}


def correction_requested(query: str) -> bool:
    """Identifica rejeição da interpretação, sem tratá-la como falha de uma operação."""
    return bool(re.search(r'\b(nao foi isso|nao e isso|nao perguntei|eu pedi|eu perguntei|voce entendeu errado|i asked|not what i asked|you misunderstood)\b', query))


def expand_address(query: str) -> str:
    """Expande abreviações comuns de segunda pessoa antes de casar a intenção."""
    query = re.sub(r'\b(vc|vce|ce)\b', 'voce', query)
    return re.sub(r'\bur\b', 'you are', query)


def self_directed_intent(query: str) -> str | None:
    """Classifica fala sobre o mascote; None quando o assunto é a conta ou o portal."""
    query = expand_address(query)
    if _ACCOUNT.search(query):
        return None
    if re.search(r'\b(quem (te|o )?criou|quem e denky|seu criador|your creator|who created you|who is denky)\b', query):
        return 'creator'
    if _LOOKS_TEASE.search(query):
        return 'appearance_tease'
    if _LOOKS_COMPLIMENT.search(query) or _LOOKS_ITEM.search(query):
        return 'appearance_compliment'
    if _LOOKS_QUESTION.search(query):
        return 'appearance'
    if re.search(r'\b(sobre (voce|si mesmo)|about yourself|conhecer (melhor )?voce)\b', query):
        return 'identity'
    for intent, examples in _SOCIAL_EXAMPLES.items():
        if any(ratio(query, example) >= 88 for example in (*examples['pt'], *examples['en'])):
            return intent
    return None


def explicit_identity(query: str) -> bool:
    """Reconhece apresentação ou comentário dirigido ao assistente sobre ele mesmo."""
    return self_directed_intent(query) is not None


def identity_reply(language: str, correction: bool = False, intent: str = 'identity') -> dict:
    """Resposta editorial sobre o personagem, sem fonte de FAQ nem ação externa."""
    texts, pose = _REPLIES.get(intent, _REPLIES['identity'])
    prefix = ''
    if correction and intent == 'identity':
        prefix = ('Desculpa, interpretei errado. Você queria saber sobre mim. ' if language == 'pt'
                  else 'Sorry, I misunderstood. You wanted to know about me. ')
    reply = {'text': prefix + texts[language], 'pose': pose}
    if intent == 'creator':
        reply['action'] = CREATOR_PORTFOLIO_ACTION[language]
    return reply


def self_talk_reply(query: str, language: str, correction: bool = False) -> dict | None:
    """Resposta social sobre o mascote, ou None quando a mensagem não é sobre ele."""
    intent = self_directed_intent(query)
    if intent is None:
        return None
    return identity_reply(language, correction, intent)


def social_articles(language: str) -> list[dict]:
    """Exemplos de fala sobre o mascote usados pelo mesmo modelo semântico que busca o FAQ."""
    articles = []
    for intent, examples in _SOCIAL_EXAMPLES.items():
        texts, _pose = _REPLIES[intent]
        for example in examples[language]:
            articles.append({
                'id': f'social:{intent}',
                'question': example,
                'keywords': [],
                'short_answer': texts[language],
                'answer': texts[language],
                'kind': 'social',
                'intent': intent,
            })
    return articles
