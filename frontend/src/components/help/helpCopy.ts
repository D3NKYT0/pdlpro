import type { HelpChatMessage } from './HelpChat'
import { denkynhoWelcome, type HelpLanguage } from './personality'
import { initialDialogueState } from './dialogue'
import { type HelpIdentity } from './identity'
import { type HelpPreferences as Preferences } from './preferences'

type Message = HelpChatMessage

/** Alinhado a ``MESSAGE_MAX_LENGTH`` no backend — evita colagens que o modelo ecoa. */
export const MAX_CHAT_MESSAGE_LENGTH = 400

export const welcome = (identity: HelpIdentity, language: HelpLanguage, preferences?: Preferences | null): Message => ({
  id: 0,
  role: 'assistant',
  text: preferences?.preferred_name
    ? language === 'pt'
      ? `Olá, ${preferences.preferred_name}! Sou o Denkynho. Vamos continuar sua jornada no PDL?`
      : language === 'es'
        ? `¡Hola, ${preferences.preferred_name}! Soy Denkynho. ¿Seguimos tu viaje en el PDL?`
        : `Hi, ${preferences.preferred_name}! I'm Denkynho. Let's continue your PDL journey.`
    : denkynhoWelcome(new Date(), identity, language),
  pose: '01-boas-vindas',
})

export const dialogueWithPreferences = (language: HelpLanguage, preferences: Preferences | null) => ({
  ...initialDialogueState(language),
  ...(preferences
    ? {
        name: preferences.preferred_name || undefined,
        detailPreference: preferences.detail === 'brief' ? ('short' as const) : preferences.detail,
      }
    : {}),
})

export function idempotencyKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (part) => {
    const value = Math.floor(Math.random() * 16)
    return (part === 'x' ? value : (value & 0x3) | 0x8).toString(16)
  })
}

export const copy = {
  pt: {
    title: 'Ajuda',
    eyebrow: 'Converse com o Denkynho',
    description: 'Orientações para sua jornada no PDL.',
    support: 'Atendimento da equipe',
    companion: 'Seu companheiro no PDL',
    ask: 'Como posso ajudar você?',
    searching: 'Procurando uma orientação…',
    talking: 'Conversando com você…',
    idle: 'Curtindo um momento tranquilo.',
    caring: 'Cuidando do Denkynho…',
    animate: 'Animar personagem',
    reduced: 'Movimento reduzido ativado no seu dispositivo.',
    faq: 'Consultar o FAQ',
    chat: 'Vamos conversar',
    context: 'O contexto vale enquanto esta conversa estiver aberta',
    fresh: 'Nova conversa',
    assistant: 'Seu assistente',
    chatLabel: 'Chat de ajuda',
    messages: 'Mensagens da conversa',
    you: 'Você',
    full: 'Ver orientação completa',
    source: 'Fonte',
    related: 'Talvez você queira saber:',
    topic: 'Assunto',
    all: 'Todos os assuntos',
    loading: 'Carregando perguntas de ajuda…',
    empty: 'Ainda não há perguntas publicadas. O atendimento da equipe está disponível.',
    consulting: 'Consultando a base de ajuda…',
    error: 'Não foi possível consultar a ajuda.',
    petLoading: 'Carregando atributos do Denkynho…',
    petError: 'Não foi possível carregar os atributos do Denkynho.',
    pet: 'Seu Denkynho',
    level: 'Nível',
    xp: 'XP',
    attributes: 'Atributos',
    satiety: 'Saciedade',
    energy: 'Energia',
    happiness: 'Alegria',
    hygiene: 'Higiene',
    emotion: 'Humor',
    empathy: 'Acompanha o que você sente',
    needsMood: 'De acordo com o cuidado',
    reveal: 'Mostrar resposta completa',
    message: 'Sua mensagem',
    placeholder: 'Escreva sua dúvida…',
    hint: 'Enter envia · Shift+Enter quebra a linha. Não envie senhas ou códigos.',
    thinking: 'Pensando…',
    send: 'Enviar mensagem',
    invalid: 'Escreva uma pergunta de até 400 caracteres.',
    blocked: 'Essa mensagem contém uma palavra que não pode ser usada no chat. Reformule de modo respeitoso.',
    language: 'Idioma',
  },
  en: {
    title: 'Help',
    eyebrow: 'Chat with Denkynho',
    description: 'Guidance for your PDL journey.',
    support: 'Contact the team',
    companion: 'Your PDL companion',
    ask: 'How can I help you?',
    searching: 'Looking for guidance…',
    talking: 'Talking with you…',
    idle: 'Enjoying a quiet moment.',
    caring: 'Taking care of Denkynho…',
    animate: 'Animate character',
    reduced: 'Reduced motion is enabled on your device.',
    faq: 'Browse the FAQ',
    chat: "Let's talk",
    context: 'Context is kept while this conversation remains open',
    fresh: 'New conversation',
    assistant: 'Your assistant',
    chatLabel: 'Help chat',
    messages: 'Conversation messages',
    you: 'You',
    full: 'View full guidance',
    source: 'Source',
    related: 'You may also want to know:',
    topic: 'Topic',
    all: 'All topics',
    loading: 'Loading help topics…',
    empty: 'No help topics are published yet. The support team is available.',
    consulting: 'Searching the help center…',
    error: 'The help center could not be reached.',
    petLoading: 'Loading Denkynho attributes…',
    petError: 'Denkynho attributes could not be loaded.',
    pet: 'Your Denkynho',
    level: 'Level',
    xp: 'XP',
    attributes: 'Attributes',
    satiety: 'Satiety',
    energy: 'Energy',
    happiness: 'Happiness',
    hygiene: 'Hygiene',
    emotion: 'Mood',
    empathy: 'Feeling with you',
    needsMood: 'According to his care',
    reveal: 'Show full response',
    message: 'Your message',
    placeholder: 'Type your question…',
    hint: 'Enter sends · Shift+Enter adds a line. Never send passwords or codes.',
    thinking: 'Thinking…',
    send: 'Send message',
    invalid: 'Write a question with up to 400 characters.',
    blocked: 'This message contains language that cannot be used in chat. Please rephrase it respectfully.',
    language: 'Language',
  },
} as const
