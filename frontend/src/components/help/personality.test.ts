import { describe, expect, it } from 'vitest'
import { denkynhoWelcome, DENKYNHO_WELCOME, matchPersonality } from './personality'

describe('personalidade do Denkynho', () => {
  it.each([
    ['Oi!', '01-boas-vindas', 'Como posso ajudar'],
    ['Olá, como vai?', '02-sucesso', 'Estou bem'],
    ['Muito obrigada', '02-sucesso', 'Pode contar comigo'],
    ['Até mais', '01-boas-vindas', 'Até a próxima'],
    ['Quem é você?', '04-dica', 'assistente virtual do PDL 2.0'],
    ['Você é uma inteligência artificial?', '04-dica', 'não sou humano'],
    ['Quem te criou?', '08-surpreso', 'mascote assistente'],
    ['Você dorme?', '06-rindo', 'cochilos'],
    ['Conte uma piada', '06-rindo', 'inventário'],
    ['Consegui!', '02-sucesso', 'ótima notícia'],
    ['Estou triste', '07-triste', 'momento está difícil'],
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

  it.each(['', 'Como recupero minha senha?', 'Como funciona a carteira do PDL?', 'oi '.repeat(50)])('deixa perguntas de conhecimento para a próxima camada: %s', message => {
    expect(matchPersonality(message)).toBeUndefined()
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
