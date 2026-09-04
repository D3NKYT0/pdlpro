import { describe, expect, it } from 'vitest'
import { answerQuestion, helpArticles, type HelpArticle } from './answers'

const article = (id: string, question: string, short_answer: string, answer: string, keywords: string[] = []): HelpArticle => ({
  id, question, short_answer, answer, keywords, category: 'account_security', category_label: 'Conta e segurança',
})
const articles = [
  article('1', 'Como recuperar minha senha?', 'Use a recuperação.', 'Use a recuperação na tela de login.', ['esqueci senha', 'reset']),
  article('2', 'Como pagar com PIX?', 'Abra a carteira.', 'Abra a carteira e confira os métodos.', ['pagamento']),
]

describe('respostas em camadas fundamentadas no FAQ', () => {
  it('aceita a lista pública e o estado vazio', () => { expect(helpArticles(articles)).toEqual(articles); expect(helpArticles([])).toEqual([]) })
  it.each([null, {}, [null], [{ id: 1 }], [{ ...articles[0], short_answer: 2 }], [{ ...articles[0], category: '' }], [{ ...articles[0], keywords: 'senha' }]])('recusa resposta inválida %j', value => { expect(() => helpArticles(value)).toThrow('resposta inválida') })
  it('entrega resposta rápida, detalhes, fonte e relacionados', () => {
    expect(answerQuestion('COMO recuperar minha SÊNHA?', articles)).toEqual({
      text: articles[0].short_answer, details: articles[0].answer, source: articles[0].question,
      related: [], pose: '04-dica',
    })
  })
  it('encontra sinônimos cadastrados sem acentos', () => { expect(answerQuestion('preciso de ajuda sobre reset', articles).source).toBe(articles[0].question) })
  it.each(['', 'como posso', 'senha errada', 'reiniciar servidor'])('não inventa orientação para %s', text => { expect(answerQuestion(text, articles)).toMatchObject({ pose: '09-confuso' }); expect(answerQuestion(text, articles).source).toBeUndefined() })
  it('não escolhe arbitrariamente e oferece os assuntos próximos', () => {
    const result = answerQuestion('senha', [...articles, article('3', 'Como alterar a senha L2?', 'Abra Conta L2.', 'Use a ação de senha.', ['senha'])])
    expect(result.source).toBeUndefined()
    expect(result.related).toHaveLength(2)
    expect(result.text).toContain('assuntos próximos')
  })
  it('acolhe cumprimentos e lida com base vazia', () => { expect(answerQuestion('Olá!', []).pose).toBe('01-boas-vindas'); expect(answerQuestion('Minha conta', []).pose).toBe('09-confuso') })
})
