export interface HelpArticle { id: string; question: string; answer: string }
export interface HelpAnswer { text: string; source?: string; pose: string }
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
const ignored = new Set(['como', 'onde', 'qual', 'quais', 'para', 'pelo', 'pela', 'meu', 'minha', 'uma', 'com', 'que', 'por', 'posso', 'faco', 'sobre', 'preciso', 'ajuda'])

/** Valida a fronteira da base pública antes de exibir respostas no chat. */
export function helpArticles(data: unknown): HelpArticle[] {
  if (!Array.isArray(data) || data.some(item => !item || typeof item.id !== 'string' || typeof item.question !== 'string' || typeof item.answer !== 'string' || !item.question.trim() || !item.answer.trim())) throw new Error('A base de ajuda retornou uma resposta inválida.')
  return data
}

/** Busca conservadora no FAQ publicado. Nunca inventa uma resposta quando há dúvida. */
export function answerQuestion(question: string, articles: HelpArticle[]): HelpAnswer {
  const query = normalize(question)
  if (/^(oi|ola|bom dia|boa tarde|boa noite)$/.test(query)) return { text: 'Olá! Sou o Denkynho. Posso ajudar você a encontrar as orientações publicadas pelo PDL. Qual é a sua dúvida?', pose: '01-boas-vindas' }
  const exact = articles.find(item => normalize(item.question) === query)
  const words = [...new Set(query.split(' ').filter(word => word.length >= 3 && !ignored.has(word)))]
  const candidates = articles.filter(item => {
    const title = normalize(item.question).split(' ')
    return words.length > 0 && words.every(word => title.includes(word))
  })
  const article = exact ?? (candidates.length === 1 ? candidates[0] : undefined)
  return article
    ? { text: article.answer, source: article.question, pose: '04-dica' }
    : { text: 'Não encontrei uma resposta segura para essa pergunta na nossa base. Você pode escolher uma das perguntas sugeridas, consultar o FAQ ou conversar com a equipe pelo atendimento.', pose: '09-confuso' }
}
