import { matchPersonality, normalizeConversation } from './personality'

export interface HelpArticle { id: string; question: string; short_answer: string; answer: string; category: string; category_label: string; keywords: string[] }
export interface HelpAnswer { text: string; details?: string; source?: string; related?: HelpArticle[]; pose: string }
const normalize = normalizeConversation
const ignored = new Set(['como', 'onde', 'qual', 'quais', 'para', 'pelo', 'pela', 'meu', 'minha', 'uma', 'com', 'que', 'por', 'posso', 'faco', 'sobre', 'preciso', 'ajuda'])

/** Valida a fronteira da base pública antes de exibir respostas no chat. */
export function helpArticles(data: unknown): HelpArticle[] {
  if (!Array.isArray(data) || data.some(item => !item || typeof item.id !== 'string' || typeof item.question !== 'string' || typeof item.short_answer !== 'string' || typeof item.answer !== 'string' || typeof item.category !== 'string' || typeof item.category_label !== 'string' || !Array.isArray(item.keywords) || item.keywords.some((keyword: unknown) => typeof keyword !== 'string') || !item.question.trim() || !item.answer.trim() || !item.category.trim() || !item.category_label.trim())) throw new Error('A base de ajuda retornou uma resposta inválida.')
  return data
}

/** Busca conservadora no FAQ publicado. Nunca inventa uma resposta quando há dúvida. */
export function answerQuestion(question: string, articles: HelpArticle[]): HelpAnswer {
  const query = normalize(question)
  const social = matchPersonality(question)
  if (social) return social
  const exact = articles.find(item => normalize(item.question) === query)
  const words = [...new Set(query.split(' ').filter(word => word.length >= 3 && !ignored.has(word)))]
  const ranked = articles.map(item => {
    const title = new Set(normalize(item.question).split(' '))
    const keywords = new Set(item.keywords.flatMap(keyword => normalize(keyword).split(' ')))
    const matched = words.filter(word => title.has(word) || keywords.has(word))
    const score = matched.reduce((total, word) => total + (title.has(word) ? 3 : 2), 0) + (normalize(item.question).includes(query) && query.length >= 5 ? 4 : 0)
    return { item, matched: matched.length, score }
  }).filter(candidate => candidate.matched > 0).sort((a, b) => b.matched - a.matched || b.score - a.score)
  const complete = ranked.filter(candidate => words.length > 0 && candidate.matched === words.length)
  const article = exact ?? (complete.length === 1
    ? complete[0].item
    : complete[0]?.score >= (complete[1]?.score ?? 0) + 4 ? complete[0].item : undefined)
  const related = ranked.slice(0, 3).map(candidate => candidate.item).filter(item => item.id !== article?.id)
  return article
    ? { text: article.short_answer || article.answer, details: article.short_answer && article.short_answer !== article.answer ? article.answer : undefined, source: article.question, related, pose: '04-dica' }
    : { text: related.length ? 'Encontrei alguns assuntos próximos, mas preciso que você escolha a orientação correta.' : 'Não encontrei uma resposta segura para essa pergunta na nossa base. Você pode consultar o FAQ ou conversar com a equipe pelo atendimento.', related, pose: '09-confuso' }
}
