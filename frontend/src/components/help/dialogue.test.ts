import { describe, expect, it } from 'vitest'
import type { HelpArticle } from './answers'
import { initialDialogueState, isLocalDialogueMessage, respondToMessage } from './dialogue'

const article = (id: string, question: string, category: string, keywords: string[] = []): HelpArticle => ({
  id, question, category, keywords, category_label: category,
  short_answer: `Rápida ${id}.`, answer: `Orientação completa ${id}.`,
})
const articles = [
  article('portal', 'Como altero a senha do portal?', 'account_security', ['senha portal']),
  article('l2', 'Como altero a senha da conta L2?', 'game_accounts', ['senha jogo']),
  article('wallet', 'Como funciona a carteira?', 'economy', ['saldo moedas']),
]

describe('motor de diálogo do Denkynho', () => {
  it('lembra o nome somente no estado da conversa', () => {
    const named = respondToMessage('Pode me chamar de Dani', articles, initialDialogueState())
    expect(named.state.name).toBe('Dani')
    const greeting = respondToMessage('Oi', articles, named.state)
    expect(greeting.answer.text).toMatch(/^Dani, /)
    expect(initialDialogueState().name).toBeUndefined()
  })

  it('recusa apelido impróprio sem gravar nem repetir o termo', () => {
    const result = respondToMessage('Pode me chamar de rola', articles, initialDialogueState())
    expect(result.state.name).toBeUndefined()
    expect(result.answer.text).not.toContain('rola')
    expect(result.answer.text).toContain('não pode ser usado')
  })

  it('aplica preferências curta e detalhada às respostas seguintes', () => {
    const short = respondToMessage('Prefiro respostas curtas', articles, initialDialogueState())
    const shortAnswer = respondToMessage(articles[2].question, articles, short.state)
    expect(shortAnswer.answer.text).toBe('Rápida wallet.')
    expect(shortAnswer.answer.details).toBeUndefined()
    const detailed = respondToMessage('Quero respostas detalhadas', articles, shortAnswer.state)
    const detailedAnswer = respondToMessage(articles[2].question, articles, detailed.state)
    expect(detailedAnswer.answer.text).toBe('Orientação completa wallet.')
  })

  it('mantém contexto para “sim”, detalhes e falhas repetidas', () => {
    const first = respondToMessage(articles[2].question, articles, initialDialogueState())
    expect(first.answer.followUp).toBeTruthy()
    const yes = respondToMessage('sim', articles, first.state)
    expect(yes.answer.text).toContain('Orientação completa wallet')
    const failed = respondToMessage('não funcionou', articles, yes.state)
    expect(failed.state.attempts).toBe(1)
    const failedAgain = respondToMessage('já tentei', articles, failed.state)
    expect(failedAgain.answer.text).toContain('abrir um chamado')
    expect(failedAgain.state.attempts).toBe(2)
  })

  it('pede esclarecimento e aceita a opção escolhida', () => {
    const ambiguous = respondToMessage('senha', articles, initialDialogueState())
    expect(ambiguous.answer.text).toContain('mais de um caminho')
    expect(ambiguous.state.pendingChoiceIds).toEqual(['portal', 'l2'])
    const choice = respondToMessage('segunda', articles, ambiguous.state)
    expect(choice.answer.source).toBe(articles[1].question)
    expect(choice.state.pendingChoiceIds).toEqual([])
  })

  it('mantém uma emoção positiva na orientação seguinte e depois a reduz', () => {
    const success = respondToMessage('Consegui!', articles, initialDialogueState())
    expect(success.state.mood).toEqual({ pose: '02-sucesso', remaining: 2 })
    expect(success.state.emotion).toBe('joyful')
    const next = respondToMessage(articles[2].question, articles, success.state)
    expect(next.answer.pose).toBe('02-sucesso')
  })

  it('responde como está de acordo com a tristeza do usuário', () => {
    const sad = respondToMessage('Estou triste', articles, initialDialogueState())
    expect(sad.state.emotion).toBe('sad')
    const check = respondToMessage('Como vai?', articles, sad.state)
    expect(check.answer.pose).toBe('07-triste')
    expect(check.answer.text).toContain('aqui com você')
  })

  it('classifica mensagens que dispensam uma nova consulta ao FAQ', () => {
    const state = { ...initialDialogueState(), lastArticleId: 'wallet', pendingChoiceIds: ['portal', 'l2'] }
    expect(isLocalDialogueMessage('Como vai?', state)).toBe(true)
    expect(isLocalDialogueMessage('Mais detalhes', state)).toBe(true)
    expect(isLocalDialogueMessage('segunda', state)).toBe(true)
    expect(isLocalDialogueMessage('Como deposito itens?', state)).toBe(false)
  })
})

it('aceita escolhas ordinais em inglês e preserva o idioma no contexto', () => {
  const state = { ...initialDialogueState('en'), pendingChoiceIds: ['portal', 'l2'] }
  const result = respondToMessage('second', articles, state)
  expect(result.state.lastArticleId).toBe('l2')
  expect(result.answer.followUp).toContain('Would you like')
})
