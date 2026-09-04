import { answerQuestion, type HelpAnswer, type HelpArticle } from './answers'
import { matchPersonality, normalizeConversation } from './personality'

export type DetailPreference = 'balanced' | 'short' | 'detailed'

export interface DialogueState {
  turn: number
  detailPreference: DetailPreference
  name?: string
  lastArticleId?: string
  pendingChoiceIds: string[]
  attempts: number
  lastOfferTurn: number
  mood?: { pose: string; remaining: number }
}

export interface DialogueResult {
  answer: HelpAnswer
  state: DialogueState
  kind: 'social' | 'context' | 'knowledge'
}

export const initialDialogueState = (): DialogueState => ({
  turn: 0,
  detailPreference: 'balanced',
  pendingChoiceIds: [],
  attempts: 0,
  lastOfferTurn: -3,
})

const detailRequests = /^(explique melhor|quero mais detalhes|mais detalhes|como assim|e depois|o que faco depois|pode explicar)$/
const failures = /^(nao funcionou|nao deu certo|deu erro|continua dando erro|nao achei|nao encontrei|ja tentei|tentei isso)$/
const shortPreference = /^(prefiro respostas curtas|responda curto|seja breve|resposta curta)$/
const detailedPreference = /^(prefiro respostas detalhadas|quero respostas detalhadas|pode detalhar|explique tudo)$/

const followUps: Record<string, string> = {
  getting_started: 'Quer que eu indique qual página abrir primeiro?',
  account_security: 'Quer que eu diferencie a conta do portal da conta L2?',
  game_accounts: 'Quer ajuda para identificar a conta ou o personagem correto?',
  economy: 'Quer que eu explique qual saldo ou inventário participa da operação?',
  commerce: 'Quer que eu mostre o que conferir antes de confirmar?',
  games_rewards: 'Quer que eu explique as regras ou o resgate?',
  community: 'Quer que eu indique onde esse conteúdo aparece?',
  support: 'Quer que eu explique como abrir um chamado?',
}

function named(state: DialogueState, text: string): string {
  return state.name && state.turn % 2 === 0 ? `${state.name}, ${text.charAt(0).toLowerCase()}${text.slice(1)}` : text
}

function emotion(state: DialogueState, preferred: string): { pose: string; mood?: DialogueState['mood'] } {
  if (preferred === '04-dica' && state.mood?.remaining && ['02-sucesso', '06-rindo'].includes(state.mood.pose)) {
    return { pose: state.mood.pose, mood: { ...state.mood, remaining: state.mood.remaining - 1 } }
  }
  const expressive = ['02-sucesso', '06-rindo', '07-triste', '10-frustrado'].includes(preferred)
  return { pose: preferred, mood: expressive ? { pose: preferred, remaining: 2 } : undefined }
}

function articleAnswer(article: HelpArticle, state: DialogueState): HelpAnswer {
  const detailed = state.detailPreference === 'detailed'
  const text = detailed ? article.answer : article.short_answer || article.answer
  const details = !detailed && state.detailPreference !== 'short' && article.short_answer !== article.answer ? article.answer : undefined
  const canOffer = state.turn - state.lastOfferTurn >= 3
  const emotional = emotion(state, '04-dica')
  return {
    text: named(state, text),
    details,
    followUp: canOffer ? followUps[article.category] : undefined,
    source: article.question,
    pose: emotional.pose,
  }
}

function selectedChoice(message: string, state: DialogueState, articles: HelpArticle[]): HelpArticle | undefined {
  const choices = state.pendingChoiceIds.map(id => articles.find(article => article.id === id)).filter((article): article is HelpArticle => Boolean(article))
  const query = normalizeConversation(message)
  const index = /^(1|primeira|primeiro|opcao 1)$/.test(query) ? 0 : /^(2|segunda|segundo|opcao 2)$/.test(query) ? 1 : /^(3|terceira|terceiro|opcao 3)$/.test(query) ? 2 : -1
  if (index >= 0) return choices[index]
  const matched = answerQuestion(message, choices)
  return matched.source ? choices.find(article => article.question === matched.source) : undefined
}

/** Informa se a mensagem pode ser resolvida com o estado local, sem atualizar o FAQ. */
export function isLocalDialogueMessage(message: string, state: DialogueState): boolean {
  const query = normalizeConversation(message)
  return Boolean(
    matchPersonality(message, state.turn)
    || shortPreference.test(query)
    || detailedPreference.test(query)
    || /^(me chamo|pode me chamar de) /.test(query)
    || (state.lastArticleId && (detailRequests.test(query) || failures.test(query)))
    || (state.lastArticleId && state.lastOfferTurn === state.turn && /^(sim|quero|pode ser|por favor|nao|agora nao|nao obrigado|nao obrigada)$/.test(query))
    || (state.pendingChoiceIds.length && /^(1|2|3|primeira|primeiro|segunda|segundo|terceira|terceiro|opcao [123])$/.test(query)),
  )
}

/** Conduz uma rodada da conversa e devolve o novo estado imutável da sessão. */
export function respondToMessage(message: string, articles: HelpArticle[], current: DialogueState): DialogueResult {
  const state: DialogueState = { ...current, turn: current.turn + 1, pendingChoiceIds: [...current.pendingChoiceIds] }
  const query = normalizeConversation(message)
  const nameMatch = message.trim().match(/^(?:me chamo|pode me chamar de)\s+([\p{L}][\p{L}' -]{0,29})[.!?]?$/iu)
  if (nameMatch) {
    const name = nameMatch[1].trim().replace(/\s+/g, ' ')
    return { answer: { text: `Prazer, ${name}! Vou lembrar seu nome durante esta conversa. Como posso ajudar?`, pose: '01-boas-vindas' }, state: { ...state, name }, kind: 'context' }
  }
  if (shortPreference.test(query) || detailedPreference.test(query)) {
    const detailPreference: DetailPreference = shortPreference.test(query) ? 'short' : 'detailed'
    return {
      answer: { text: detailPreference === 'short' ? 'Combinado! Vou responder de forma mais direta nesta conversa.' : 'Combinado! Vou trazer a orientação completa nas próximas respostas.', pose: '02-sucesso' },
      state: { ...state, detailPreference, mood: { pose: '02-sucesso', remaining: 2 } }, kind: 'context',
    }
  }
  const lastArticle = articles.find(article => article.id === current.lastArticleId)
  if (lastArticle && detailRequests.test(query)) {
    return { answer: { text: named(state, lastArticle.answer), source: lastArticle.question, followUp: 'Isso esclareceu ou você encontrou algum erro?', pose: '04-dica' }, state: { ...state, detailPreference: 'detailed', lastOfferTurn: state.turn }, kind: 'context' }
  }
  if (lastArticle && /^(sim|quero|pode ser|por favor)$/.test(query) && current.lastOfferTurn === current.turn) {
    return { answer: { text: named(state, lastArticle.answer), source: lastArticle.question, followUp: 'Se não funcionar, diga “não funcionou” e tentamos outro caminho.', pose: '04-dica' }, state: { ...state, detailPreference: 'detailed', lastOfferTurn: state.turn }, kind: 'context' }
  }
  if (/^(nao|agora nao|nao obrigado|nao obrigada)$/.test(query) && current.lastOfferTurn === current.turn) {
    return { answer: { text: 'Tudo bem! Seguimos no seu ritmo. Quando quiser continuar, é só me chamar.', pose: '01-boas-vindas' }, state, kind: 'context' }
  }
  if (lastArticle && failures.test(query)) {
    const attempts = current.attempts + 1
    const text = attempts >= 2
      ? 'Entendi. Como a orientação já foi tentada, o melhor próximo passo é abrir um chamado para a equipe analisar o caso da sua conta.'
      : 'Entendi. Confira novamente os requisitos mostrados na tela e tente atualizar a página. Se o erro continuar, não repita operações de pagamento, saldo ou itens.'
    return { answer: { text: named(state, text), source: lastArticle.question, followUp: attempts >= 2 ? 'Abra Atendimento e descreva o erro sem enviar senhas ou códigos.' : 'Quer tentar mais uma vez ou prefere falar com a equipe?', pose: '10-frustrado' }, state: { ...state, attempts, lastOfferTurn: state.turn, mood: { pose: '10-frustrado', remaining: 1 } }, kind: 'context' }
  }
  if (current.pendingChoiceIds.length) {
    const choice = selectedChoice(message, current, articles)
    if (choice) return { answer: articleAnswer(choice, state), state: { ...state, lastArticleId: choice.id, pendingChoiceIds: [], attempts: 0, lastOfferTurn: state.turn }, kind: 'context' }
  }
  const social = matchPersonality(message, current.turn)
  if (social) {
    const emotional = emotion(current, social.pose)
    return { answer: { ...social, text: named(state, social.text), pose: emotional.pose }, state: { ...state, mood: emotional.mood }, kind: 'social' }
  }
  const found = answerQuestion(message, articles)
  const article = found.source ? articles.find(item => item.question === found.source) : undefined
  if (article) {
    const answer = articleAnswer(article, state)
    const mood = answer.pose === '04-dica' || !state.mood ? undefined : state.mood.remaining > 1 ? { ...state.mood, remaining: state.mood.remaining - 1 } : undefined
    return { answer, state: { ...state, lastArticleId: article.id, pendingChoiceIds: [], attempts: 0, lastOfferTurn: answer.followUp ? state.turn : current.lastOfferTurn, mood }, kind: 'knowledge' }
  }
  if (found.related?.length) {
    const related = found.related.slice(0, 3)
    return {
      answer: { text: 'Encontrei mais de um caminho possível. Qual destas opções representa melhor sua dúvida?', related, pose: '09-confuso' },
      state: { ...state, pendingChoiceIds: related.map(item => item.id) }, kind: 'knowledge',
    }
  }
  return { answer: found, state: { ...state, pendingChoiceIds: [] }, kind: 'knowledge' }
}
