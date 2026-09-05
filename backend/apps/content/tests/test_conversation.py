from apps.content.application.conversation import (
    expand_address,
    identity_reply,
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
