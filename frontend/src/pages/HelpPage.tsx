import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Headphones, MessageCircle } from 'lucide-react'
import {
  contentApi,
  programsApi,
  type DenkynhoAction,
  type ApiDenkynhoCareResult,
} from '../services/api'
import { useLocation } from 'react-router-dom'
import { getHelpContext, supportTicketPrefill } from '../components/help/contextual'
import { ButtonLink } from '../components/ui/Button'
import { PageHeader } from '../components/ui/PageHeader'
import { useAsyncAction } from '../hooks/useAsyncAction'
import { helpArticles, type HelpArticle } from '../components/help/answers'
import { Denkynho } from '../components/help/Denkynho'
import { HelpCompanion } from '../components/help/HelpCompanion'
import { HelpChat, type HelpChatMessage } from '../components/help/HelpChat'
import { HelpPetCare, helpActivities } from '../components/help/HelpPetCare'
import { useReducedMotion } from '../components/help/useReducedMotion'
import { defaultDenkynhoEmotion, emotionStatus, isDenkynhoEmotion } from '../components/help/emotions'
import { denkynhoWelcome, type HelpLanguage } from '../components/help/personality'
import { initialDialogueState, isLocalDialogueMessage, respondToMessage } from '../components/help/dialogue'
import { speechFrame } from '../components/help/speech'
import { useAuth } from '../contexts/AuthContext'
import { helpIdentity, type HelpIdentity } from '../components/help/identity'
import { moderateChatInput } from '../components/help/moderation'
import { thinkingPhrase } from '../components/help/thinking'
import { loadHelpPreferences, storeHelpPreferences, type HelpPreferences as Preferences } from '../components/help/preferences'
import {
  advanceAmbient,
  ambientDuration,
  ambientPose,
  IDLE_TRIGGER_MS,
  startAmbient,
  type AmbientState,
} from '../components/help/idleRoutine'

type Message = HelpChatMessage
/** Alinhado a ``MESSAGE_MAX_LENGTH`` no backend — evita colagens que o modelo ecoa. */
const MAX_CHAT_MESSAGE_LENGTH = 400
const welcome = (identity: HelpIdentity, language: HelpLanguage, preferences?: Preferences | null): Message => ({
  id: 0,
  role: 'assistant',
  text: preferences?.preferred_name
    ? language === 'pt'
      ? `Olá, ${preferences.preferred_name}! Sou o Denkynho. Vamos continuar sua jornada no PDL?`
      : `Hi, ${preferences.preferred_name}! I'm Denkynho. Let's continue your PDL journey.`
    : denkynhoWelcome(new Date(), identity, language),
  pose: '01-boas-vindas',
})
const dialogueWithPreferences = (language: HelpLanguage, preferences: Preferences | null) => ({
  ...initialDialogueState(language),
  ...(preferences
    ? {
        name: preferences.preferred_name || undefined,
        detailPreference: preferences.detail === 'brief' ? ('short' as const) : preferences.detail,
      }
    : {}),
})
function idempotencyKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (part) => {
    const value = Math.floor(Math.random() * 16)
    return (part === 'x' ? value : (value & 0x3) | 0x8).toString(16)
  })
}
const copy = {
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

/** Conversa temporária com geração local e fallback explícito para a ajuda editorial. */
export function HelpPage() {
  const { user } = useAuth()
  const location = useLocation()
  const queryClient = useQueryClient()
  const identity = helpIdentity(user)
  const [preferences, setPreferences] = useState<Preferences | null>(() => loadHelpPreferences(user?.id))
  const [language, setLanguage] = useState<HelpLanguage>(() => loadHelpPreferences(user?.id)?.language ?? 'pt')
  const labels = copy[language]
  const faq = useQuery({
    queryKey: ['help-faq', user?.id, language],
    queryFn: async () => helpArticles(await contentApi.authenticatedFaq(language)),
    retry: false,
  })
  const action = useAsyncAction()
  const petAction = useAsyncAction()
  const petQueryKey = ['denkynho-pet', user?.id] as const
  const pet = useQuery({ queryKey: petQueryKey, queryFn: contentApi.denkynho, enabled: Boolean(user), retry: false })
  const reduced = useReducedMotion()
  const [animations, setAnimations] = useState(true)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<Message[]>(() => [welcome(identity, language, preferences)])
  const resources = useQuery({
    queryKey: ['resources'],
    queryFn: programsApi.resources,
    staleTime: 15000,
    retry: false,
    enabled: Boolean(location.search) || messages.some((message) => message.role === 'assistant' && message.text.includes('/painel')),
  })
  const screenContext = getHelpContext(
    new URLSearchParams(location.search).get('from'),
    user,
    resources.isSuccess ? resources.data : undefined,
    language,
  )
  const [dialogue, setDialogue] = useState(() => dialogueWithPreferences(language, preferences))
  const [context, setContext] = useState('')
  const [limited, setLimited] = useState(false)
  const [revealing, setRevealing] = useState<Message | null>(null)
  const [shown, setShown] = useState(0)
  const [ambient, setAmbient] = useState<AmbientState | null>(null)
  const [ambientSpeech, setAmbientSpeech] = useState(0)
  const [activity, setActivity] = useState<string | null>(null)
  const [thinkFor, setThinkFor] = useState(0)
  const [careResult, setCareResult] = useState<ApiDenkynhoCareResult | null>(null)
  const careRetry = useRef<{ action: DenkynhoAction; key: string } | null>(null)
  const ambientCareKey = useRef<string | null>(null)
  const ambientSelfCare = useRef(false)
  const [validation, setValidation] = useState('')
  const [failed, setFailed] = useState(false)
  const [moderationBlocked, setModerationBlocked] = useState(false)
  const [topic, setTopic] = useState('all')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const sequence = useRef(0)
  const mounted = useRef(true)
  const session = useRef(0)
  const thread = useRef<HTMLDivElement>(null)
  const followLatest = useRef(true)
  const preferencesDirty = useRef(true)
  const hydratedPrefs = useRef(false)
  const animated = animations && !reduced
  const busy = action.pending || Boolean(revealing)

  function changeLanguage(next: HelpLanguage) {
    setLanguage(next)
    setContext('')
    setLimited(false)
    session.current++
    setMessages([welcome(identity, next, preferences)])
    setDialogue(dialogueWithPreferences(next, preferences))
    if (preferences) {
      const updated = { ...preferences, language: next }
      setPreferences(updated)
      if (updated.remember && user?.id) storeHelpPreferences(user.id, updated)
    }
    setDraft('')
    setValidation('')
    setAmbient(null)
    setFailed(false)
    setModerationBlocked(false)
    setExpanded(new Set())
  }

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  useEffect(() => {
    const felt = pet.data?.emotion
    if (!isDenkynhoEmotion(felt)) return
    const id = felt.id
    setDialogue((current) =>
      current.emotion === (id === 'calm' ? undefined : id) ? current : { ...current, emotion: id === 'calm' ? undefined : id },
    )
  }, [pet.data?.emotion])
  useEffect(() => {
    const saved = loadHelpPreferences(user?.id)
    const nextLanguage = saved?.language ?? 'pt'
    setPreferences(saved)
    setLanguage(nextLanguage)
    session.current++
    setContext('')
    setLimited(false)
    setMessages([welcome(helpIdentity(user), nextLanguage, saved)])
    setDialogue(dialogueWithPreferences(nextLanguage, saved))
    setRevealing(null)
    setDraft('')
    setAmbient(null)
    setValidation('')
    setFailed(false)
    setModerationBlocked(false)
    setExpanded(new Set())
    setCareResult(null)
    setActivity(null)
    careRetry.current = null
    hydratedPrefs.current = false
  }, [user?.id, user?.role])
  useEffect(() => {
    const stored = pet.data?.preferences
    if (!stored || hydratedPrefs.current) return
    hydratedPrefs.current = true
    const saved = loadHelpPreferences(user?.id)
    setPreferences({
      preferred_name: stored.preferred_name || saved?.preferred_name || '',
      detail: stored.detail || saved?.detail || 'balanced',
      language: saved?.language ?? language,
      remember: Boolean(saved?.remember || stored.preferred_name),
    })
  }, [pet.data?.preferences, user?.id, language])
  useEffect(() => {
    if (!action.pending) {
      setThinkFor(0)
      return
    }
    const timer = setInterval(() => setThinkFor((current) => current + 2800), 2800)
    return () => clearInterval(timer)
  }, [action.pending])
  useEffect(() => {
    if (!activity) return
    const timer = setTimeout(() => setActivity(null), 8000)
    return () => clearTimeout(timer)
  }, [activity])
  useEffect(() => {
    if (busy || petAction.pending || activity || draft || ambient) return
    const timer = setTimeout(() => {
      const unlocked = (pet.data?.unlocks ?? []).filter((item) => item.slot === 'scene' && item.unlocked).map((item) => item.id)
      setAmbient(
        startAmbient({
          language,
          currentScene: pet.data?.appearance?.scene,
          unlockedScenes: unlocked,
          canDance: Boolean(pet.data?.available_actions?.includes('dance')),
          reducedMotion: !animated,
          needs: pet.data?.attributes,
          emotionId: isDenkynhoEmotion(pet.data?.emotion) ? pet.data.emotion.id : undefined,
        }),
      )
      setAmbientSpeech(0)
      ambientCareKey.current = null
    }, IDLE_TRIGGER_MS)
    return () => clearTimeout(timer)
  }, [
    busy,
    petAction.pending,
    messages,
    draft,
    activity,
    ambient,
    pet.data?.appearance?.scene,
    pet.data?.unlocks,
    pet.data?.available_actions,
    pet.data?.attributes,
    pet.data?.emotion,
    language,
    animated,
  ])
  useEffect(() => {
    if (!ambient) return
    const ctx = {
      language,
      currentScene: pet.data?.appearance?.scene,
      unlockedScenes: (pet.data?.unlocks ?? []).filter((item) => item.slot === 'scene' && item.unlocked).map((item) => item.id),
      canDance: Boolean(pet.data?.available_actions?.includes('dance')),
      reducedMotion: !animated,
      needs: pet.data?.attributes,
      emotionId: isDenkynhoEmotion(pet.data?.emotion) ? pet.data.emotion.id : undefined,
    }
    const timer = setTimeout(() => {
      setAmbient((current) => (current ? advanceAmbient(current, ctx) : null))
    }, ambientDuration(ambient, animated))
    return () => clearTimeout(timer)
  }, [ambient, language, animated, pet.data?.appearance?.scene, pet.data?.unlocks, pet.data?.available_actions, pet.data?.attributes, pet.data?.emotion])
  useEffect(() => {
    setAmbientSpeech(0)
  }, [ambient?.activity, ambient?.phase, ambient?.line])
  useEffect(() => {
    if (!ambient?.talking) {
      setAmbientSpeech(0)
      return
    }
    if (!animated) {
      setAmbientSpeech(Array.from(ambient.line).length)
      return
    }
    const chars = Array.from(ambient.line)
    if (ambientSpeech >= chars.length) return
    const frame = speechFrame(ambient.line, ambientSpeech, ambient.pose)
    const timer = setTimeout(() => setAmbientSpeech((count) => Math.min(chars.length, count + frame.step)), frame.delay)
    return () => clearTimeout(timer)
  }, [ambient, ambientSpeech, animated])
  useEffect(() => {
    if (!ambient?.careAction) return
    if (ambient.phase !== 'act' && ambient.phase !== 'sleep') return
    const key = `${ambient.planIndex}:${ambient.activity}:${ambient.careAction}`
    if (ambientCareKey.current === key || petAction.pending) return
    ambientCareKey.current = key
    ambientSelfCare.current = true
    const actionName = ambient.careAction
    const currentSession = session.current
    void petAction
      .run(async () => {
        const updated = await contentApi.careDenkynho(actionName, idempotencyKey())
        if (!mounted.current || currentSession !== session.current) return updated
        queryClient.setQueryData(petQueryKey, updated)
        await queryClient.invalidateQueries({ queryKey: petQueryKey })
        return updated
      })
      .then((result) => {
        ambientSelfCare.current = false
        if (result.ok && mounted.current && currentSession === session.current) setCareResult(result.value)
      })
  }, [ambient?.phase, ambient?.activity, ambient?.careAction, ambient?.planIndex, petAction, queryClient, petQueryKey])
  useEffect(() => {
    if (busy || draft) {
      setActivity(null)
      setAmbient(null)
      setAmbientSpeech(0)
      ambientCareKey.current = null
    } else if (petAction.pending && !ambientSelfCare.current) {
      setActivity(null)
      setAmbient(null)
      setAmbientSpeech(0)
      ambientCareKey.current = null
    }
  }, [busy, petAction.pending, draft])
  const finish = useCallback(() => setRevealing(null), [])
  useEffect(() => {
    if (!revealing) return
    if (!animated) {
      finish()
      return
    }
    const chars = Array.from(revealing.text)
    if (shown >= chars.length) {
      finish()
      return
    }
    const frame = speechFrame(revealing.text, shown, revealing.pose)
    const timer = setTimeout(() => setShown((count) => Math.min(chars.length, count + frame.step)), frame.delay)
    return () => clearTimeout(timer)
  }, [revealing, shown, animated, finish])
  useEffect(() => {
    const node = thread.current
    if (node && followLatest.current) node.scrollTop = node.scrollHeight
  }, [messages, revealing, shown])

  async function send(text = draft, retryId?: number) {
    const question = text.trim()
    if (!question || question.length > MAX_CHAT_MESSAGE_LENGTH) {
      setValidation(labels.invalid)
      return
    }
    if (!moderateChatInput(question).allowed) {
      setValidation(labels.blocked)
      setModerationBlocked(true)
      setAmbient(null)
      return
    }
    if (busy) return
    setValidation('')
    setAmbient(null)
    setFailed(false)
    setModerationBlocked(false)
    const currentSession = session.current
    const messageId =
      retryId ??
      messages.findLast((message) => message.role === 'user' && message.status === 'failed' && message.text === question)?.id ??
      ++sequence.current
    const result = await action.run(async () => {
      followLatest.current = true
      setDraft((current) => (current.trim() === question ? '' : current))
      setMessages((previous) =>
        previous.some((message) => message.id === messageId)
          ? previous.map((message) => (message.id === messageId ? { ...message, status: 'sending' } : message))
          : [...previous, { id: messageId, role: 'user', text: question, status: 'sending' }],
      )
      const server = await contentApi.assistantReply(
        question,
        language,
        context,
        preferences && (!context || preferencesDirty.current)
          ? { preferred_name: preferences.preferred_name, detail: preferences.detail }
          : undefined,
        screenContext?.path ?? '/painel/ajuda',
      )
      if (
        !server ||
        !['knowledge', 'unknown', 'blocked', 'social', 'crisis'].includes(server.kind) ||
        typeof server.answer?.text !== 'string' ||
        typeof server.answer?.pose !== 'string' ||
        (server.answer.action !== undefined &&
          (server.answer.action?.url !== 'https://denky.dev.br/' || typeof server.answer.action?.label !== 'string')) ||
        (server.related_ids !== undefined && (!Array.isArray(server.related_ids) || server.related_ids.some((id) => typeof id !== 'string')))
      )
        throw new Error(labels.error)
      if (
        (server.context !== undefined && typeof server.context !== 'string') ||
        (server.mode !== undefined && !['generative', 'limited'].includes(server.mode))
      )
        throw new Error(labels.error)
      if (server.emotion !== undefined && !isDenkynhoEmotion(server.emotion)) throw new Error(labels.error)
      return {
        server,
        dialogue:
          server.kind !== 'blocked' &&
          server.kind !== 'crisis' &&
          server.mode !== 'generative' &&
          isLocalDialogueMessage(question, dialogue)
            ? respondToMessage(question, faq.data ?? [], dialogue)
            : undefined,
      }
    })
    if (!mounted.current || currentSession !== session.current) return
    if (!result.ok) {
      if (!result.skipped) {
        setFailed(true)
        setMessages((previous) => previous.map((message) => (message.id === messageId ? { ...message, status: 'failed' } : message)))
        setDraft((current) => current || question)
      }
      return
    }
    if (result.value.server?.kind === 'blocked') {
      setValidation(result.value.server.answer.text)
      setModerationBlocked(true)
      setMessages((previous) => previous.filter((message) => message.id !== messageId))
      setDraft((current) => current || question)
      return
    }
    preferencesDirty.current = false
    setContext(result.value.server.context ?? '')
    setLimited(result.value.server.mode !== 'generative')
    const felt = isDenkynhoEmotion(result.value.server.emotion) ? result.value.server.emotion : undefined
    if (felt) queryClient.setQueryData(petQueryKey, (current) => (current ? { ...current, emotion: felt } : current))
    const resolved = result.value.dialogue ?? {
      answer: {
        ...result.value.server!.answer,
        text:
          dialogue.detailPreference === 'detailed'
            ? result.value.server!.answer.details || result.value.server!.answer.text
            : result.value.server!.answer.text,
        details: dialogue.detailPreference === 'balanced' ? (result.value.server!.answer.details ?? undefined) : undefined,
        related: (result.value.server!.related_ids ?? [])
          .map((id) => faq.data?.find((item) => item.id === id))
          .filter((item): item is HelpArticle => Boolean(item)),
      },
      state: {
        ...dialogue,
        turn: dialogue.turn + 1,
        lastArticleId: result.value.server!.article_id,
        pendingChoiceIds: result.value.server!.related_ids ?? [],
        emotion: felt?.id ?? dialogue.emotion,
      },
    }
    if (felt && result.value.dialogue) resolved.state = { ...resolved.state, emotion: felt.id }
    const reply: Message = { id: ++sequence.current, role: 'assistant', ...resolved.answer }
    setDialogue(resolved.state)
    setMessages((previous) => [...previous.map((message) => (message.id === messageId ? { ...message, status: undefined } : message)), reply])
    setShown(0)
    setRevealing(animated ? reply : null)
  }

  async function careFor(item: (typeof helpActivities)[number], onActivity: () => void) {
    if (!pet.data || petAction.pending || busy) return
    const currentSession = session.current
    const key = careRetry.current?.action === item.action ? careRetry.current.key : idempotencyKey()
    careRetry.current = { action: item.action, key }
    const result = await petAction.run(async () => {
      const updated = await contentApi.careDenkynho(item.action as DenkynhoAction, key)
      if (!mounted.current || currentSession !== session.current) return updated
      queryClient.setQueryData(petQueryKey, updated)
      await queryClient.invalidateQueries({ queryKey: petQueryKey })
      return updated
    })
    if (!mounted.current || currentSession !== session.current || !result.ok) return
    careRetry.current = null
    setCareResult(result.value)
    setAmbient(null)
    setAmbientSpeech(0)
    ambientCareKey.current = null
    setActivity(item.pose)
    onActivity()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    void send()
  }
  function onDraftKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    if (!draft.trim() || busy) return
    void send()
  }

  const categories = Array.from(new Map((faq.data ?? []).map((item) => [item.category, item.category_label])).entries())
  const suggestions = (faq.data ?? []).filter((item) => topic === 'all' || item.category === topic).slice(0, 4)
  const last = messages[messages.length - 1]
  const emotion = isDenkynhoEmotion(pet.data?.emotion) ? pet.data.emotion : defaultDenkynhoEmotion
  const emotionPose = emotion.idle_pose
  const celebrating = Boolean(activity && careResult?.level_up && !careResult.replayed)
  const pose = action.pending
    ? '03-pensando'
    : moderationBlocked
      ? '10-frustrado'
      : failed
        ? '07-triste'
        : revealing
          ? (last.pose ?? emotionPose)
          : celebrating
            ? '02-sucesso'
            : (activity ?? (ambient ? ambientPose(ambient) : last.id === 0 ? emotionPose : (last.pose ?? emotionPose)))
  const currentActivity = helpActivities.find((item) => item.pose === pose)
  const standingSleep = Boolean(ambient?.standingSleep)
  const ambientTalking = Boolean(ambient?.talking)
  const companionStatus = ambient
    ? ambient.line
    : petAction.pending
      ? labels.caring
      : action.pending
        ? thinkingPhrase(thinkFor, language)
        : revealing
          ? labels.talking
          : (currentActivity?.status[language] ?? (emotion.id !== 'calm' ? emotionStatus(emotion, language) : labels.ask))
  const ambientMouth = ambientTalking ? speechFrame(ambient!.line, ambientSpeech, ambient!.pose).mouthOpen : false

  return (
    <div className="help-page">
      <PageHeader
        className="help-hero"
        title={labels.title}
        eyebrow={
          <>
            <MessageCircle aria-hidden="true" /> {labels.eyebrow}
          </>
        }
        description={labels.description}
        actions={
          <ButtonLink to={supportTicketPrefill(screenContext?.path, language)?.to ?? '/painel/support'} variant="secondary" size="sm">
            <Headphones aria-hidden="true" /> {labels.support}
          </ButtonLink>
        }
      />
      <div className="help-workspace">
        <HelpCompanion
          faqLink={
            <ButtonLink to="/faq" variant="secondary" size="sm">
              <BookOpen aria-hidden="true" /> {labels.faq}
            </ButtonLink>
          }
          language={language}
          onChat={() => thread.current?.parentElement?.querySelector('textarea')?.focus()}
          status={companionStatus}
          mascot={
            <Denkynho
              pose={pose}
              idle={standingSleep}
              still={Boolean(ambient?.still)}
              animated={animated}
              appearance={pet.data?.appearance}
              sceneOverride={ambient?.scene}
              celebration={celebrating}
              dancing={activity === '13-dancando' || Boolean(ambient?.dancing)}
              talking={Boolean(revealing) || ambientTalking}
              mouthOpen={revealing ? speechFrame(revealing.text, shown, revealing.pose).mouthOpen : ambientMouth}
            />
          }
        >
          {(onActivity) => (
            <HelpPetCare
              labels={labels}
              language={language}
              userId={user?.id}
              pet={pet.data}
              petLoading={pet.isLoading}
              petQueryError={pet.error}
              petIsError={pet.isError}
              petActionError={petAction.error}
              petActionPending={petAction.pending}
              busy={busy}
              draft={draft}
              failed={failed}
              moderationBlocked={moderationBlocked}
              activity={activity}
              careResult={careResult}
              emotion={emotion}
              animated={animated}
              reduced={reduced}
              preferences={preferences}
              onAnimationsChange={setAnimations}
              onLanguageChange={changeLanguage}
              onCare={(item, ready) => {
                void careFor(item, ready)
              }}
              onProfileChange={(updated) => queryClient.setQueryData(petQueryKey, updated)}
              onPreferencesPersist={async (next) => {
                const updated = await contentApi.updateDenkynhoPreferences({
                  preferred_name: next.preferred_name,
                  detail: next.detail,
                })
                queryClient.setQueryData(petQueryKey, (current) =>
                  current
                    ? { ...current, ...updated, preferences: updated.preferences ?? { preferred_name: next.preferred_name, detail: next.detail } }
                    : updated,
                )
              }}
              onPreferencesApply={(next) => {
                preferencesDirty.current = true
                setPreferences(next)
                setDialogue((current) => ({
                  ...current,
                  name: next.preferred_name || undefined,
                  detailPreference: next.detail === 'brief' ? 'short' : next.detail,
                }))
                if (!next.preferred_name) setContext('')
              }}
              onActivityReady={onActivity}
            />
          )}
        </HelpCompanion>
        <HelpChat
          labels={labels}
          language={language}
          messages={messages}
          limited={limited}
          busy={busy}
          draft={draft}
          validation={validation}
          topic={topic}
          categories={categories}
          suggestions={suggestions}
          showTopics={Boolean(faq.data?.length)}
          screenContext={screenContext}
          faqLoading={faq.isLoading}
          faqError={faq.error}
          faqEmpty={faq.isSuccess && !faq.data.length}
          actionPending={action.pending}
          actionFailed={failed}
          actionError={action.error}
          revealing={revealing}
          shown={shown}
          expanded={expanded}
          activity={activity}
          careResult={careResult}
          resources={resources.isSuccess ? resources.data : undefined}
          user={user}
          maxLength={MAX_CHAT_MESSAGE_LENGTH}
          threadRef={thread}
          onFresh={() => {
            session.current++
            setContext('')
            setLimited(false)
            setMessages([welcome(identity, language, preferences)])
            setDialogue(dialogueWithPreferences(language, preferences))
            setDraft('')
            setValidation('')
            setAmbient(null)
            setFailed(false)
            setModerationBlocked(false)
            setExpanded(new Set())
            followLatest.current = true
          }}
          onScrollFollow={(follow) => {
            followLatest.current = follow
          }}
          onDraftChange={setDraft}
          onClearValidation={() => {
            setValidation('')
            setModerationBlocked(false)
          }}
          onDraftKey={onDraftKey}
          onSubmit={submit}
          onTopicChange={setTopic}
          onSend={(text, retryId) => {
            void send(text, retryId)
          }}
          onExpand={(id) => setExpanded((current) => new Set(current).add(id))}
          onRevealFinish={finish}
          onFaqRetry={() => {
            void faq.refetch()
          }}
          onContextSuggest={(suggestion) => {
            setDraft(suggestion)
            thread.current?.parentElement?.querySelector('textarea')?.focus()
          }}
        />
      </div>
    </div>
  )
}
