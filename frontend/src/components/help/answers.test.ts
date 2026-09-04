import { describe, expect, it } from 'vitest'
import { answerQuestion, helpArticles } from './answers'
const articles = [{ id: '1', question: 'Como recuperar minha senha?', answer: 'Use a recuperação na tela de login.' }, { id: '2', question: 'Como pagar com PIX?', answer: 'Abra a carteira.' }]
describe('respostas fundamentadas no FAQ', () => {
  it('aceita a lista pública e o estado vazio', () => { expect(helpArticles(articles)).toEqual(articles); expect(helpArticles([])).toEqual([]) })
  it.each([null, {}, [null], [{ id: 1 }], [{ id: '1', question: '', answer: 'ok' }], [{ id: '1', question: 'ok', answer: ' ' }]])('recusa resposta inválida %j', value => { expect(() => helpArticles(value)).toThrow('resposta inválida') })
  it('responde sem reescrever a orientação e identifica a fonte', () => { expect(answerQuestion('COMO recuperar minha SÊNHA?', articles)).toEqual({ text: articles[0].answer, source: articles[0].question, pose: '04-dica' }) })
  it('encontra termos significativos sem acentos', () => { expect(answerQuestion('preciso de ajuda sobre senha', articles).source).toBe(articles[0].question) })
  it.each(['', 'como posso', 'senha errada', 'reiniciar servidor'])('não inventa orientação para %s', text => { expect(answerQuestion(text, articles)).toMatchObject({ pose: '09-confuso' }); expect(answerQuestion(text, articles).source).toBeUndefined() })
  it('não escolhe arbitrariamente entre duas respostas', () => { expect(answerQuestion('senha', [...articles, { id: '3', question: 'Alterar senha', answer: 'Outra orientação' }]).source).toBeUndefined() })
  it('acolhe cumprimentos e lida com base vazia', () => { expect(answerQuestion('Olá!', []).pose).toBe('01-boas-vindas'); expect(answerQuestion('Minha conta', []).pose).toBe('09-confuso') })
})
