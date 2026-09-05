from apps.content.application.conversation import (
    APPEARANCE_TEASE_TEXT,
    allows_semantic_social,
    contextual_social_reply,
    expand_address,
    hurt_reaction_reply,
    identity_reply,
    laugh_reaction_reply,
    self_directed_intent,
    self_talk_reply,
)


def test_expands_common_second_person_shortcuts():
    assert expand_address('vc e feio') == 'voce e feio'
    assert expand_address('ce e bonito') == 'voce e bonito'
    assert expand_address('ur ugly') == 'you are ugly'


def test_teasing_about_looks_is_self_talk_not_identity():
    assert self_directed_intent('vc e feio') == 'appearance_tease'
    assert self_directed_intent('voce e muito feio') == 'appearance_tease'
    assert self_directed_intent('you are ugly') == 'appearance_tease'
    reply = self_talk_reply('vc e feio', 'pt')
    assert reply is not None
    assert reply['pose'] == '08-surpreso'
    assert 'gravata azul' in reply['text']
    assert 'PDL 2.0' not in reply['text']


def test_compliments_and_looks_questions_stay_about_the_mascot():
    assert self_directed_intent('voce e fofo') == 'appearance_compliment'
    assert self_directed_intent('gosto da sua gravata') == 'appearance_compliment'
    assert self_directed_intent('como voce se parece') == 'appearance'
    assert 'cabelo escuro' in self_talk_reply('como voce e', 'pt')['text']
    assert self_talk_reply('i like your tie', 'en')['pose'] == '06-rindo'


def test_account_questions_are_not_treated_as_self_talk():
    assert self_directed_intent('me fale sobre meus personagens do jogo') is None
    assert self_directed_intent('onde altero meu perfil e avatar') is None
    assert self_directed_intent('voce consegue acessar minha conta') is None


def test_identity_correction_keeps_the_editorial_prefix():
    reply = identity_reply('pt', correction=True)
    assert reply['text'].startswith('Desculpa, interpretei errado.')
    assert 'Denkynho' in reply['text']
    tease = identity_reply('pt', correction=True, intent='appearance_tease')
    assert not tease['text'].startswith('Desculpa')


def test_hurt_reaction_after_tease_does_not_repeat_the_joke():
    assert hurt_reaction_reply('grosso me deixou triste kk', 'pt')['pose'] == '07-triste'
    assert 'Desculpa' in hurt_reaction_reply('grosso me deixou triste kk', 'pt')['text']
    assert 'revista' not in hurt_reaction_reply('grosso me deixou triste kk', 'pt')['text']
    history = [
        {'role': 'user', 'content': 'vc e feio'},
        {'role': 'assistant', 'content': APPEARANCE_TEASE_TEXT['pt']},
    ]
    follow = contextual_social_reply('grosso me deixou triste kk', 'pt', history)
    assert follow['pose'] == '07-triste'
    assert follow['text'] != APPEARANCE_TEASE_TEXT['pt']


def test_laugh_after_tease_acknowledges_without_repeating():
    history = [
        {'role': 'user', 'content': 'vc e feio'},
        {'role': 'assistant', 'content': APPEARANCE_TEASE_TEXT['pt']},
    ]
    follow = contextual_social_reply('kkk boa essa', 'pt', history)
    assert follow['pose'] == '06-rindo'
    assert 'riu' in follow['text']
    assert laugh_reaction_reply('kkkk', 'pt')['pose'] == '06-rindo'


def test_risky_social_intents_need_explicit_match():
    assert allows_semantic_social('voce e feio', 'appearance_tease')
    assert not allows_semantic_social('grosso me deixou triste kk', 'appearance_tease')
    assert allows_semantic_social('como voce se descreveria', 'identity')
    assert not allows_semantic_social('como deposito itens', 'affection')


def test_creator_biography_uses_public_professional_facts_and_portfolio():
    assert self_directed_intent('quem e denky') == 'creator'
    assert self_directed_intent('tell me about your creator') == 'creator'
    reply = self_talk_reply('quero conhecer seu criador', 'pt')
    assert reply['pose'] == '04-dica'
    assert 'arquiteto de sistemas' in reply['text']
    assert 'alter ego' in reply['text']
    assert reply['action'] == {'label': 'Conhecer o criador', 'url': 'https://denky.dev.br/'}
    assert 'Daniel' not in reply['text']


def test_expanded_self_talk_covers_common_social_cases():
    cases = [
        ('te amo', 'affection', '06-rindo', 'carinho'),
        ('senti sua falta', 'missed', '01-boas-vindas', 'te ver de novo'),
        ('me anima', 'encourage', '02-sucesso', 'passo de cada vez'),
        ('somos amigos', 'friendship', '02-sucesso', 'companheiro de jornada'),
        ('quantos anos voce tem', 'age', '04-dica', 'Não tenho idade'),
        ('qual sua cor favorita', 'favorites', '06-rindo', 'azul da gravata'),
        ('voce me ve', 'limits', '04-dica', 'não te vejo'),
        ('voce sabe meu saldo', 'limits', '04-dica', 'não leio saldo'),
        ('so quero conversar', 'just_chat', '01-boas-vindas', 'só conversar'),
        ('voce e demais', 'praise', '02-sucesso', 'Fico feliz'),
        ('i missed you', 'missed', '01-boas-vindas', 'Good to see'),
        ('cheer me up', 'encourage', '02-sucesso', 'One step'),
    ]
    for message, intent, pose, excerpt in cases:
        language = 'en' if message[0].isascii() and message.startswith(('i ', 'cheer')) else 'pt'
        if message.startswith(('i missed', 'cheer')):
            language = 'en'
        assert self_directed_intent(message) == intent, message
        reply = self_talk_reply(message, language)
        assert reply['pose'] == pose, message
        assert excerpt in reply['text'], message
