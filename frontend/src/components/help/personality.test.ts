import { describe, expect, it } from 'vitest'
import { denkynhoWelcome, DENKYNHO_WELCOME, matchPersonality } from './personality'

describe('personalidade do Denkynho', () => {
  it.each([
    ['Oi!', '01-boas-vindas', 'Como posso ajudar'],
    ['Olá, como vai?', '02-sucesso', 'Estou bem'],
    ['Muito obrigada', '02-sucesso', 'Pode contar comigo'],
    ['Até mais', '01-boas-vindas', 'Até a próxima'],
    ['Quem é você?', '04-dica', 'companheiro virtual no PDL 2.0'],
    ['Como você se parece?', '01-boas-vindas', 'cabelo escuro'],
    ['vc é feio', '08-surpreso', 'gravata azul'],
    ['Você é fofo', '06-rindo', 'camisa preta'],
    ['Gosto da sua gravata', '06-rindo', 'minha marca'],
    ['Te amo', '06-rindo', 'carinho'],
    ['Senti sua falta', '01-boas-vindas', 'te ver de novo'],
    ['Me anima', '02-sucesso', 'passo de cada vez'],
    ['Somos amigos', '02-sucesso', 'companheiro de jornada'],
    ['Quantos anos você tem?', '04-dica', 'Não tenho idade'],
    ['Qual sua cor favorita?', '06-rindo', 'azul da gravata'],
    ['Você me vê?', '04-dica', 'não te vejo'],
    ['Só quero conversar', '01-boas-vindas', 'só conversar'],
    ['Você é demais', '02-sucesso', 'Fico feliz'],
    ['kkkk', '06-rindo', 'riu comigo'],
    ['Você é uma inteligência artificial?', '04-dica', 'não sou humano'],
    ['Quem te criou?', '04-dica', 'arquiteto de sistemas'],
    ['Você dorme?', '06-rindo', 'cochilos'],
    ['Conte uma piada', '06-rindo', 'inventário'],
    ['Consegui!', '02-sucesso', 'ótima notícia'],
    ['Estou triste', '07-triste', 'momento está difícil'],
    ['grosso me deixou triste kk', '07-triste', 'Desculpa se soei grosso'],
    ['Estou cansada', '05-dormindo', 'pausa'],
    ['Não entendi', '09-confuso', 'outras palavras'],
    ['Foi mal', '01-boas-vindas', 'Está tudo bem'],
    ['Você é chato', '10-frustrado', 'respeitosa'],
  ])('responde %s com pose e voz coerentes', (message, pose, excerpt) => {
    expect(matchPersonality(message)).toMatchObject({ pose, text: expect.stringContaining(excerpt) })
  })

  it('responde como está de acordo com o sentimento do usuário', () => {
    expect(matchPersonality('Como vai?', 0, 'pt', 'sad')).toMatchObject({ pose: '07-triste', text: expect.stringContaining('aqui com você') })
    expect(matchPersonality('how are you', 0, 'en', 'sad')).toMatchObject({ pose: '07-triste', text: expect.stringContaining('here with you') })
  })

  it.each(['', 'Como recupero minha senha?', 'Como funciona a carteira do PDL?', 'oi '.repeat(50), 'Onde altero meu perfil e avatar?'])('deixa perguntas de conhecimento para a próxima camada: %s', message => {
    expect(matchPersonality(message)).toBeUndefined()
  })

  it('responde em inglês a comentários sociais variados', () => {
    expect(matchPersonality("you're ugly", 0, 'en')).toMatchObject({ pose: '08-surpreso', text: expect.stringContaining('blue tie') })
    expect(matchPersonality('how do you look', 0, 'en')).toMatchObject({ pose: '01-boas-vindas', text: expect.stringContaining('dark hair') })
    expect(matchPersonality('i missed you', 0, 'en')).toMatchObject({ pose: '01-boas-vindas', text: expect.stringContaining('Good to see') })
    expect(matchPersonality('cheer me up', 0, 'en')).toMatchObject({ pose: '02-sucesso', text: expect.stringContaining('One step') })
    expect(matchPersonality('can you see me', 0, 'en')).toMatchObject({ pose: '04-dica', text: expect.stringContaining("can't see you") })
  })

  it('apresenta o criador sem dados privados e oferece o portfólio público', () => {
    const reply = matchPersonality('Quero conhecer seu criador')
    expect(reply).toMatchObject({
      text: expect.stringContaining('alter ego'),
      action: { label: 'Conhecer o criador', url: 'https://denky.dev.br/' },
    })
    expect(reply?.text).not.toContain('Daniel')
    expect(matchPersonality('who is Denky', 0, 'en')?.action).toEqual({ label: 'Meet my creator', url: 'https://denky.dev.br/' })
  })

  it('mantém as marcas centrais da voz nas boas-vindas', () => {
    expect(DENKYNHO_WELCOME).toContain('companheiro')
    expect(DENKYNHO_WELCOME).toContain('PDL')
    expect(DENKYNHO_WELCOME).toContain('juntos')
  })

  it('cumprimenta de acordo com o período local', () => {
    expect(denkynhoWelcome(new Date(2026, 0, 1, 8))).toMatch(/^Bom dia/)
    expect(denkynhoWelcome(new Date(2026, 0, 1, 14))).toMatch(/^Boa tarde/)
    expect(denkynhoWelcome(new Date(2026, 0, 1, 21))).toMatch(/^Boa noite/)
  })

  it('varia a formulação sem mudar a intenção', () => {
    expect(matchPersonality('Oi', 0)?.text).not.toBe(matchPersonality('Oi', 1)?.text)
    expect(matchPersonality('Oi', 0)?.pose).toBe(matchPersonality('Oi', 1)?.pose)
  })
})
