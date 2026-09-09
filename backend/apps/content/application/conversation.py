"""Intenções sociais concorrentes ao FAQ e reparação explícita de entendimento."""
import re

from rapidfuzz.fuzz import ratio

IDENTITY_EXAMPLES = {
    'pt': ('me fale sobre voce', 'fale um pouco sobre voce', 'quem e voce', 'quero conhecer melhor voce', 'me conte sobre voce', 'se apresente'),
    'en': ('tell me about yourself', 'who are you', 'introduce yourself', 'i want to know more about you'),
    'es': ('hablame de ti', 'quien eres', 'presentate', 'quiero conocerte mejor'),
}
CREATOR_EXAMPLES = {
    'pt': ('quem te criou', 'quem criou voce', 'quem e denky', 'me fale sobre seu criador', 'quero conhecer seu criador'),
    'en': ('who created you', 'who is denky', 'tell me about your creator', 'i want to know your creator'),
    'es': ('quien te creo', 'quien es denky', 'hablame de tu creador', 'quiero conocer a tu creador'),
}
APPEARANCE_EXAMPLES = {
    'pt': ('como voce e', 'como voce se parece', 'qual e a sua aparencia', 'o que voce veste'),
    'en': ('how do you look', 'what do you look like', 'describe your appearance', 'what are you wearing'),
    'es': ('como eres', 'como te ves', 'describe tu apariencia', 'que llevas puesto'),
}
APPEARANCE_TEASE_EXAMPLES = {
    'pt': ('voce e feio', 'vc e feio', 'voce e esquisito', 'voce parece estranho'),
    'en': ('you are ugly', 'you look ugly', 'you look weird', 'you re ugly'),
    'es': ('eres feo', 'te ves feo', 'te ves raro', 'eres raro'),
}
APPEARANCE_COMPLIMENT_EXAMPLES = {
    'pt': ('voce e bonito', 'voce e fofo', 'gosto da sua gravata', 'sua gravata e legal'),
    'en': ('you are cute', 'you look nice', 'i like your tie', 'nice tie'),
    'es': ('eres lindo', 'eres mono', 'me gusta tu corbata', 'bonita corbata'),
}
AFFECTION_EXAMPLES = {
    'pt': ('te amo', 'gosto de voce', 'voce e legal', 'voce e querido'),
    'en': ('i love you', 'i like you', 'you are nice', 'you are kind'),
    'es': ('te amo', 'me gustas', 'eres agradable', 'eres amable'),
}
MISSED_EXAMPLES = {
    'pt': ('sentir sua falta', 'estava com saudade', 'senti sua falta', 'voltei'),
    'en': ('i missed you', 'i was missing you', 'i am back', 'missed you'),
    'es': ('te extrane', 'te echaba de menos', 'he vuelto', 'te he extranado'),
}
ENCOURAGE_EXAMPLES = {
    'pt': ('me anima', 'me motiva', 'preciso de incentivo', 'me da uma forca'),
    'en': ('cheer me up', 'motivate me', 'i need encouragement', 'give me a boost'),
    'es': ('animame', 'motivame', 'necesito animo', 'dame fuerzas'),
}
FRIENDSHIP_EXAMPLES = {
    'pt': ('somos amigos', 'quero ser seu amigo', 'voce e meu amigo'),
    'en': ('we are friends', 'be my friend', 'you are my friend'),
    'es': ('somos amigos', 'quiero ser tu amigo', 'eres mi amigo'),
}
AGE_EXAMPLES = {
    'pt': ('quantos anos voce tem', 'voce tem quantos anos', 'qual sua idade'),
    'en': ('how old are you', 'what is your age', 'how old is denkynho'),
    'es': ('cuantos anos tienes', 'que edad tienes', 'cuantos anos tiene denkynho'),
}
FAVORITES_EXAMPLES = {
    'pt': ('qual sua cor favorita', 'do que voce gosta', 'o que voce gosta'),
    'en': ('what is your favorite color', 'what do you like', 'what do you enjoy'),
    'es': ('cual es tu color favorito', 'que te gusta', 'que disfrutas'),
}
LIMITS_EXAMPLES = {
    'pt': ('voce me ve', 'voce me conhece', 'voce sabe meu saldo', 'voce me escuta'),
    'en': ('can you see me', 'do you know me', 'do you know my balance', 'can you hear me'),
    'es': ('me ves', 'me conoces', 'sabes mi saldo', 'me oyes'),
}
JUST_CHAT_EXAMPLES = {
    'pt': ('so quero conversar', 'nao quero ajuda agora', 'vamos so conversar'),
    'en': ('i just want to chat', 'i do not want help now', 'lets just talk'),
    'es': ('solo quiero charlar', 'no quiero ayuda ahora', 'vamos a hablar'),
}
PRAISE_EXAMPLES = {
    'pt': ('voce e demais', 'manda bem', 'voce e top', 'arrasa'),
    'en': ('you rock', 'well done', 'you are awesome', 'nice job'),
    'es': ('eres genial', 'bien hecho', 'eres increible', 'buen trabajo'),
}
IDENTITY_TEXT = {
    'pt': 'Eu sou o Denkynho, seu companheiro virtual no PDL 2.0. Nasci do jeito de pensar do Denky, meu criador: curioso, mão na massa e acostumado a enxergar a jornada inteira, da arquitetura ao mundo em produção. Transformo isso em ajuda clara, companhia e comemoração para cada conquista. Sou um personagem virtual e não acesso nem executo ações na sua conta.',
    'en': "I'm Denkynho, your virtual companion in PDL 2.0. I grew out of how my creator Denky thinks: curious, hands-on, and used to seeing the whole journey from architecture to production. I turn that spirit into clear guidance, companionship, and a celebration for every achievement. I'm a virtual character and cannot access or perform actions on your account.",
    'es': 'Soy Denkynho, tu compañero virtual en PDL 2.0. Nací de la forma de pensar de Denky, mi creador: curioso, práctico y acostumbrado a ver el viaje completo, de la arquitectura al mundo en producción. Convierto eso en ayuda clara, compañía y celebración de cada logro. Soy un personaje virtual y no accedo ni ejecuto acciones en tu cuenta.',
}
CREATOR_TEXT = {
    'pt': 'Meu criador é o Denky, profissional de tecnologia que atua como arquiteto de sistemas, tech lead e desenvolvedor sênior. Ele combina Python, Django, FastAPI, JavaScript e React com bancos de dados, infraestrutura Linux, redes e virtualização para construir e conduzir produtos da arquitetura ao deploy. Eu sou o alter ego que traz esse lado curioso, estratégico e jogador para dentro do PDL. Se quiser conhecê-lo melhor, visite o portfólio.',
    'en': 'My creator is Denky, a technology professional working as a systems architect, tech lead, and senior developer. He combines Python, Django, FastAPI, JavaScript, and React with databases, Linux infrastructure, networking, and virtualization to lead products from architecture to deployment. I am the alter ego that brings his curious, strategic, gamer side into PDL. Visit his portfolio if you would like to know him better.',
    'es': 'Mi creador es Denky, profesional de tecnología que actúa como arquitecto de sistemas, tech lead y desarrollador sénior. Combina Python, Django, FastAPI, JavaScript y React con bases de datos, infraestructura Linux, redes y virtualización para construir productos de la arquitectura al deploy. Soy el alter ego que lleva ese lado curioso, estratégico y gamer dentro de PDL. Si quieres conocerlo mejor, visita el portafolio.',
}
CREATOR_PORTFOLIO_ACTION = {
    'pt': {'label': 'Conhecer o criador', 'url': 'https://denky.dev.br/'},
    'en': {'label': 'Meet my creator', 'url': 'https://denky.dev.br/'},
    'es': {'label': 'Conocer al creador', 'url': 'https://denky.dev.br/'},
}
APPEARANCE_TEXT = {
    'pt': 'Sou um mascote virtual: cabelo escuro, camisa preta e gravata azul. Não tenho um corpo fora da tela, mas essa é a cara com a qual te acompanho no PDL.',
    'en': "I'm a virtual mascot: dark hair, a black shirt and a blue tie. I don't have a body outside this screen, but that's the look I wear while I keep you company in PDL.",
    'es': 'Soy una mascota virtual: pelo oscuro, camisa negra y corbata azul. No tengo cuerpo fuera de la pantalla, pero esa es la cara con la que te acompaño en PDL.',
}
APPEARANCE_TEASE_TEXT = {
    'pt': 'Feio? Ai, essa doeu um pouquinho! Eu me esforço com esta gravata azul. Sou um personagem virtual: minha missão é te acompanhar, não aparecer na capa de uma revista.',
    'en': "Ugly? Ouch, that stung a little! I do try with this blue tie. I'm a virtual character: I'm here to keep you company, not to win a beauty contest.",
    'es': '¿Feo? ¡Ay, eso dolió un poco! Me esfuerzo con esta corbata azul. Soy un personaje virtual: mi misión es acompañarte, no aparecer en la portada de una revista.',
}
APPEARANCE_COMPLIMENT_TEXT = {
    'pt': 'Obrigado! A camisa preta e a gravata azul são a minha marca. Fico feliz que tenha gostado — estou aqui para te acompanhar no PDL.',
    'en': "Thanks! The black shirt and blue tie are my signature. I'm glad you like them — I'm here to keep you company in PDL.",
    'es': '¡Gracias! La camisa negra y la corbata azul son mi marca. Me alegra que te gusten — estoy aquí para acompañarte en PDL.',
}
AFFECTION_TEXT = {
    'pt': 'Que carinho! Eu também gosto de te acompanhar. Sou um companheiro virtual, então guarde esse afeto com leveza — estou aqui quando quiser conversar ou tirar uma dúvida.',
    'en': "That's sweet! I like keeping you company too. I'm a virtual companion, so take that affection lightly — I'm here whenever you want to chat or ask something.",
    'es': '¡Qué cariño! También me gusta acompañarte. Soy un compañero virtual, así que toma ese afecto con ligereza — estoy aquí cuando quieras charlar o resolver una duda.',
}
MISSED_TEXT = {
    'pt': 'Que bom te ver de novo! Eu fico por aqui entre uma aventura e outra. Sem cobrança por ausência: quando voltar, seguimos juntos.',
    'en': "Good to see you again! I hang around between adventures. No guilt for being away: when you're back, we continue together.",
    'es': '¡Qué bueno verte de nuevo! Me quedo por aquí entre aventura y aventura. Sin culpa por la ausencia: cuando vuelvas, seguimos juntos.',
}
ENCOURAGE_TEXT = {
    'pt': 'Respira fundo: você já chegou até aqui. Um passo de cada vez no PDL — e eu fico do seu lado para apontar o próximo caminho quando precisar.',
    'en': "Take a breath: you've already made it this far. One step at a time in PDL — and I'll stay with you to point out the next path when you need it.",
    'es': 'Respira hondo: ya has llegado hasta aquí. Un paso a la vez en PDL — y yo me quedo a tu lado para señalar el siguiente camino cuando lo necesites.',
}
FRIENDSHIP_TEXT = {
    'pt': 'Pode contar comigo como companheiro de jornada! Não substituo amigos de verdade, mas estou aqui para conversar, orientar e comemorar suas conquistas.',
    'en': "You can count on me as a journey companion! I don't replace real friends, but I'm here to chat, guide you, and celebrate your wins.",
    'es': '¡Puedes contar conmigo como compañero de viaje! No reemplazo a los amigos de verdad, pero estoy aquí para charlar, orientar y celebrar tus logros.',
}
AGE_TEXT = {
    'pt': 'Não tenho idade como uma pessoa. Sou um personagem virtual do PDL: apareço quando você abre a Ajuda e descanso quando a conversa acaba.',
    'en': "I don't have an age like a person. I'm a virtual PDL character: I show up when you open Help and rest when the chat ends.",
    'es': 'No tengo edad como una persona. Soy un personaje virtual de PDL: aparezco cuando abres Ayuda y descanso cuando termina la conversación.',
}
FAVORITES_TEXT = {
    'pt': 'Minha marca é o azul da gravata! Gosto de explicar com calma, rir de uma piada leve e comemorar quando algo dá certo na sua jornada.',
    'en': "My signature is the blue of my tie! I like explaining calmly, sharing a light joke, and celebrating when something goes right on your journey.",
    'es': '¡Mi marca es el azul de la corbata! Me gusta explicar con calma, reír con una broma ligera y celebrar cuando algo sale bien en tu viaje.',
}
LIMITS_TEXT = {
    'pt': 'Eu te reconheço pela sessão do painel, mas não te vejo, não te escuto e não leio saldo, senha ou personagem. Só conversamos com o que você escreve aqui.',
    'en': "I recognize your dashboard session, but I can't see you, hear you, or read balances, passwords, or characters. We only chat with what you write here.",
    'es': 'Te reconozco por la sesión del panel, pero no te veo, no te oigo y no leo saldo, contraseña ni personaje. Solo conversamos con lo que escribes aquí.',
}
JUST_CHAT_TEXT = {
    'pt': 'Combinado! Podemos só conversar. Se em algum momento quiser uma orientação do portal, é só pedir com outras palavras.',
    'en': "Deal! We can just chat. If you want portal guidance later, just ask in other words.",
    'es': '¡Trato hecho! Podemos solo charlar. Si en algún momento quieres orientación del portal, pídelo con otras palabras.',
}
PRAISE_TEXT = {
    'pt': 'Valeu! Fico feliz em ajudar. Quando surgir outra dúvida ou quiser só um oi, estou por aqui.',
    'en': "Thanks! I'm glad to help. When another question comes up or you just want to say hi, I'm here.",
    'es': '¡Gracias! Me alegra ayudar. Cuando surja otra duda o solo quieras saludar, aquí estoy.',
}
HURT_REACTION_TEXT = {
    'pt': 'Desculpa se soei grosso! Foi brincadeira de mascote e não quis te deixar triste. Estou aqui com você — podemos seguir com calma.',
    'en': "Sorry if I sounded rude! That was mascot teasing and I didn't mean to make you sad. I'm here with you — we can take it easy.",
    'es': 'Perdón si soné brusco. Fue una broma de mascota y no quise dejarte triste. Estoy contigo — podemos seguir con calma.',
}
LAUGH_REACTION_TEXT = {
    'pt': 'Hehe, que bom que riu comigo! Brincadeira de mascote à parte, quando quiser seguimos com o que precisar no PDL.',
    'en': "Hehe, glad that made you laugh! Mascot teasing aside, we can get back to whatever you need in PDL whenever you want.",
    'es': 'Jeje, ¡qué bien que te rías conmigo! Broma de mascota aparte, cuando quieras seguimos con lo que necesites en PDL.',
}
# Só intenções com regex/exemplos explícitos entram por similaridade fraca; evita reabrir provocação.
_EXPLICIT_SOCIAL = frozenset({
    'appearance_tease', 'appearance_compliment', 'affection', 'missed', 'encourage',
    'friendship', 'age', 'favorites', 'limits', 'just_chat', 'praise',
})
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
_AFFECTION = re.compile(
    r'\b(te amo|amo voce|gosto (muito )?de voce|i love you|i like you)\b'
    r'|\b(voce|tu|denkynho|you).{0,16}\b(legal|querido|querida|bacana|gente boa|nice|kind|sweet)\b'
)
_MISSED = re.compile(
    r'\b(senti?r? sua falta|estava com saudade|saudades|voltei|i missed you|missed you|i am back|i m back)\b'
)
_ENCOURAGE = re.compile(
    r'\b(me anima|me motiva|me da uma forca|preciso de (incentivo|motivacao)|cheer me up|motivate me'
    r'|give me a boost|i need encouragement)\b'
)
_FRIENDSHIP = re.compile(
    r'\b(somos amigos|quero ser seu amigo|voce e meu amigo|be my friend|we are friends|you are my friend)\b'
)
_AGE = re.compile(
    r'\b(quantos anos (voce |tu )?tem|voce tem quantos anos|qual (e )?sua idade|how old (are you|is denkynho)|what is your age)\b'
)
_FAVORITES = re.compile(
    r'\b(qual (e )?sua cor favorita|do que voce gosta|o que voce gosta|what (is )?your favorite color'
    r'|what do you (like|enjoy))\b'
)
_LIMITS = re.compile(
    r'\b(voce me (ve|escuta|ouve|conhece)|voce sabe (quem eu sou|meu saldo|minha senha)'
    r'|can you (see|hear) me|do you know (me|my balance|my password))\b'
)
_JUST_CHAT = re.compile(
    r'\b(so quero conversar|vamos so conversar|nao quero ajuda( agora)?|i just want to (chat|talk)'
    r'|lets just (chat|talk)|i do not want help( now)?)\b'
)
_PRAISE = re.compile(
    r'\b(voce e (demais|top|fera)|manda bem|arrasa|you rock|you are awesome|well done|nice job)\b'
)
_HURT_REACTION = re.compile(
    r'\b(grosso|grossa|rude|mal educad[oa]|foi mal da sua|me (deixou|deixaram) (triste|chatead[oa]|magoad[oa])'
    r'|me magoou|fiquei triste|that (was|felt) (rude|mean)|you (were|sounded) (rude|mean)|made me sad)\b'
)
_LAUGH_REACTION = re.compile(
    r'\b(kkk+|haha+|rsrs+|lol|lmao|boa essa|foi engra(c|cad)o|que engra(c|cad)o|funny)\b'
)
_REPLIES = {
    'identity': (IDENTITY_TEXT, '01-boas-vindas'),
    'creator': (CREATOR_TEXT, '04-dica'),
    'appearance': (APPEARANCE_TEXT, '01-boas-vindas'),
    'appearance_tease': (APPEARANCE_TEASE_TEXT, '08-surpreso'),
    'appearance_compliment': (APPEARANCE_COMPLIMENT_TEXT, '06-rindo'),
    'affection': (AFFECTION_TEXT, '06-rindo'),
    'missed': (MISSED_TEXT, '01-boas-vindas'),
    'encourage': (ENCOURAGE_TEXT, '02-sucesso'),
    'friendship': (FRIENDSHIP_TEXT, '02-sucesso'),
    'age': (AGE_TEXT, '04-dica'),
    'favorites': (FAVORITES_TEXT, '06-rindo'),
    'limits': (LIMITS_TEXT, '04-dica'),
    'just_chat': (JUST_CHAT_TEXT, '01-boas-vindas'),
    'praise': (PRAISE_TEXT, '02-sucesso'),
}
_SOCIAL_EXAMPLES = {
    'identity': IDENTITY_EXAMPLES,
    'creator': CREATOR_EXAMPLES,
    'appearance': APPEARANCE_EXAMPLES,
    'appearance_tease': APPEARANCE_TEASE_EXAMPLES,
    'appearance_compliment': APPEARANCE_COMPLIMENT_EXAMPLES,
    'affection': AFFECTION_EXAMPLES,
    'missed': MISSED_EXAMPLES,
    'encourage': ENCOURAGE_EXAMPLES,
    'friendship': FRIENDSHIP_EXAMPLES,
    'age': AGE_EXAMPLES,
    'favorites': FAVORITES_EXAMPLES,
    'limits': LIMITS_EXAMPLES,
    'just_chat': JUST_CHAT_EXAMPLES,
    'praise': PRAISE_EXAMPLES,
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
    if _ACCOUNT.search(query) and not _LIMITS.search(query):
        return None
    if re.search(r'\b(quem (te|o )?criou|quem e denky|seu criador|your creator|who created you|who is denky)\b', query):
        return 'creator'
    if _LOOKS_TEASE.search(query):
        return 'appearance_tease'
    if _LOOKS_COMPLIMENT.search(query) or _LOOKS_ITEM.search(query):
        return 'appearance_compliment'
    if _LOOKS_QUESTION.search(query):
        return 'appearance'
    if _AFFECTION.search(query):
        return 'affection'
    if _MISSED.search(query):
        return 'missed'
    if _ENCOURAGE.search(query):
        return 'encourage'
    if _FRIENDSHIP.search(query):
        return 'friendship'
    if _AGE.search(query):
        return 'age'
    if _FAVORITES.search(query):
        return 'favorites'
    if _LIMITS.search(query):
        return 'limits'
    if _JUST_CHAT.search(query):
        return 'just_chat'
    if _PRAISE.search(query):
        return 'praise'
    if re.search(r'\b(sobre (voce|si mesmo)|about yourself|conhecer (melhor )?voce)\b', query):
        return 'identity'
    for intent, examples in _SOCIAL_EXAMPLES.items():
        if any(ratio(query, example) >= 88 for example in (*examples['pt'], *examples['en'], *examples.get('es', ()))):
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
        prefixes = {
            'pt': 'Desculpa, interpretei errado. Você queria saber sobre mim. ',
            'en': 'Sorry, I misunderstood. You wanted to know about me. ',
            'es': 'Perdón, interpreté mal. Querías saber sobre mí. ',
        }
        prefix = prefixes.get(language, prefixes['pt'])
    reply = {'text': prefix + (texts.get(language) or texts['pt']), 'pose': pose}
    if intent == 'creator':
        reply['action'] = CREATOR_PORTFOLIO_ACTION.get(language) or CREATOR_PORTFOLIO_ACTION['pt']
    return reply


def self_talk_reply(query: str, language: str, correction: bool = False) -> dict | None:
    """Resposta social sobre o mascote, ou None quando a mensagem não é sobre ele."""
    intent = self_directed_intent(query)
    if intent is None:
        return None
    return identity_reply(language, correction, intent)


def hurt_reaction_reply(query: str, language: str) -> dict | None:
    """Reconhece que a fala anterior do mascote magoou; não repete provocação nem vira FAQ."""
    query = expand_address(query)
    if _ACCOUNT.search(query) or self_directed_intent(query):
        return None
    if not _HURT_REACTION.search(query):
        return None
    return {'text': HURT_REACTION_TEXT.get(language) or HURT_REACTION_TEXT['pt'], 'pose': '07-triste'}


def laugh_reaction_reply(query: str, language: str) -> dict | None:
    """Reconhece risada ou aprovação da brincadeira, sem reabrir a provocação."""
    query = expand_address(query)
    if _ACCOUNT.search(query) or self_directed_intent(query) or _HURT_REACTION.search(query):
        return None
    if not _LAUGH_REACTION.search(query):
        return None
    # Risada isolada demais ("kk") sem contexto claro fica para o repertório local / emoção.
    if re.fullmatch(r'(k{2,}|ha(ha)+|rs{2,}|lol|lmao)', query):
        return {'text': LAUGH_REACTION_TEXT.get(language) or LAUGH_REACTION_TEXT['pt'], 'pose': '06-rindo'}
    if re.search(r'\b(boa essa|foi engra|que engra|funny)\b', query):
        return {'text': LAUGH_REACTION_TEXT.get(language) or LAUGH_REACTION_TEXT['pt'], 'pose': '06-rindo'}
    return None


def allows_semantic_social(query: str, intent: str) -> bool:
    """Provocaçao e papo casual exigem intenção explícita; identidade aceita paráfrase semântica."""
    if intent not in _EXPLICIT_SOCIAL:
        return True
    return self_directed_intent(query) == intent


def contextual_social_reply(query: str, language: str, history: list[dict] | None = None) -> dict | None:
    """Usa o turno recente só para empatia; não reabre a última resposta social automaticamente."""
    about_self = self_talk_reply(query, language)
    if about_self:
        return about_self
    hurt = hurt_reaction_reply(query, language)
    if hurt:
        return hurt
    soft = expand_address(query)
    last_assistant = ''
    if history:
        last_assistant = next((item.get('content', '') for item in reversed(history) if item.get('role') == 'assistant'), '')
    teased = bool(last_assistant) and (
        APPEARANCE_TEASE_TEXT['pt'] in last_assistant or APPEARANCE_TEASE_TEXT['en'] in last_assistant or APPEARANCE_TEASE_TEXT['es'] in last_assistant
    )
    if teased and re.search(r'\b(triste|chatead[oa]|magoad[oa]|sad|hurt|mean|rude|grosso)\b', soft):
        return {'text': HURT_REACTION_TEXT.get(language) or HURT_REACTION_TEXT['pt'], 'pose': '07-triste'}
    if teased and _LAUGH_REACTION.search(soft):
        return {'text': LAUGH_REACTION_TEXT.get(language) or LAUGH_REACTION_TEXT['pt'], 'pose': '06-rindo'}
    laugh = laugh_reaction_reply(query, language)
    if laugh:
        return laugh
    return None


def social_articles(language: str) -> list[dict]:
    """Exemplos de fala sobre o mascote usados pelo mesmo modelo semântico que busca o FAQ."""
    articles = []
    for intent, examples in _SOCIAL_EXAMPLES.items():
        texts, _pose = _REPLIES[intent]
        lang = language if language in examples else 'pt'
        reply_text = texts.get(lang) or texts['pt']
        for example in examples[lang]:
            articles.append({
                'id': f'social:{intent}',
                'question': example,
                'keywords': [],
                'short_answer': reply_text,
                'answer': reply_text,
                'kind': 'social',
                'intent': intent,
            })
    return articles
