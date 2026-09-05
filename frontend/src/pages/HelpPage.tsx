import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Headphones, MessageCircle, Send } from 'lucide-react'
import { contentApi } from '../services/api'
import type { DenkynhoAction, ApiDenkynhoCareResult } from '../services/domain/content.service'
import { useLocation } from 'react-router-dom'
import { programsApi } from '../services/domain/programs.service'
import { getHelpContext, getHelpActionsForText } from '../components/help/contextual'
import { PetProgress } from '../components/help/PetProgress'
import { Button, ButtonLink } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Field } from '../components/ui/Field'
import { PageHeader } from '../components/ui/PageHeader'
import { EmptyState, ErrorNotice, LoadingState } from '../components/ui/Feedback'
import { Toggle } from '../components/ui/Toggle'
import { useAsyncAction } from '../hooks/useAsyncAction'
import { helpArticles, type HelpArticle } from '../components/help/answers'
import { Denkynho } from '../components/help/Denkynho'
import { HelpCompanion } from '../components/help/HelpCompanion'
import { useReducedMotion } from '../components/help/useReducedMotion'
import { defaultDenkynhoEmotion, emotionLabel, emotionStatus, isDenkynhoEmotion } from '../components/help/emotions'
import { denkynhoWelcome, type HelpLanguage } from '../components/help/personality'
import { initialDialogueState, isLocalDialogueMessage, respondToMessage } from '../components/help/dialogue'
import { speechFrame } from '../components/help/speech'
import { useAuth } from '../contexts/AuthContext'
import { helpIdentity, type HelpIdentity } from '../components/help/identity'
import { moderateChatInput } from '../components/help/moderation'
import { HelpPreferences } from '../components/help/HelpPreferences'
import { loadHelpPreferences, storeHelpPreferences, type HelpPreferences as Preferences } from '../components/help/preferences'
type Message = { id: number; role: 'user' | 'assistant'; text: string; status?: 'sending' | 'failed'; details?: string; followUp?: string; source?: string; related?: HelpArticle[]; pose?: string }
const welcome = (identity: HelpIdentity, language: HelpLanguage, preferences?: Preferences | null): Message => ({ id: 0, role: 'assistant', text: preferences?.preferred_name ? (language === 'pt' ? `Olá, ${preferences.preferred_name}! Sou o Denkynho. Vamos continuar sua jornada no PDL?` : `Hi, ${preferences.preferred_name}! I'm Denkynho. Let's continue your PDL journey.`) : denkynhoWelcome(new Date(), identity, language), pose: '01-boas-vindas' })
const dialogueWithPreferences = (language: HelpLanguage, preferences: Preferences | null) => ({ ...initialDialogueState(language), ...(preferences ? { name: preferences.preferred_name || undefined, detailPreference: preferences.detail === 'brief' ? 'short' as const : preferences.detail } : {}) })
const activities = [
  { action: 'feed', pose: '11-comendo', pt: 'Alimentar', en: 'Feed', status: { pt: 'Fazendo uma pausa para um lanche.', en: 'Taking a snack break.' } },
  { action: 'sleep', pose: '05-dormindo', pt: 'Dormir', en: 'Sleep', status: { pt: 'Dormindo na caminha para recuperar energia.', en: 'Sleeping in bed to recover energy.' } },
  { action: 'play', pose: '12-jogando', pt: 'Brincar', en: 'Play', status: { pt: 'Brincando para ficar mais alegre!', en: 'Playing to feel happier!' } },
  { action: 'care', pose: '06-rindo', pt: 'Dar carinho', en: 'Give care', status: { pt: 'Recebendo carinho e ficando feliz!', en: 'Getting care and feeling happy!' } },
  { action: 'dance', pose: '02-sucesso', pt: 'Dançar juntos', en: 'Dance together', status: { pt: 'Dançando com você!', en: 'Dancing with you!' } },
] as const
function idempotencyKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, part => {
    const value = Math.floor(Math.random() * 16)
    return (part === 'x' ? value : value & 0x3 | 0x8).toString(16)
  })
}
const copy = {
  pt: {
    title: 'Ajuda', eyebrow: 'Converse com o Denkynho', description: 'Orientações para sua jornada no PDL.', support: 'Atendimento da equipe', companion: 'Seu companheiro no PDL', ask: 'Como posso ajudar você?', searching: 'Procurando uma orientação…', talking: 'Conversando com você…', idle: 'Curtindo um momento tranquilo.', caring: 'Cuidando do Denkynho…', animate: 'Animar personagem', reduced: 'Movimento reduzido ativado no seu dispositivo.', faq: 'Consultar o FAQ', chat: 'Vamos conversar', context: 'O contexto vale enquanto esta conversa estiver aberta', fresh: 'Nova conversa', assistant: 'Seu assistente', chatLabel: 'Chat de ajuda', messages: 'Mensagens da conversa', you: 'Você', full: 'Ver orientação completa', source: 'Fonte', related: 'Talvez você queira saber:', topic: 'Assunto', all: 'Todos os assuntos', loading: 'Carregando perguntas de ajuda…', empty: 'Ainda não há perguntas publicadas. O atendimento da equipe está disponível.', consulting: 'Consultando a base de ajuda…', error: 'Não foi possível consultar a ajuda.', petLoading: 'Carregando atributos do Denkynho…', petError: 'Não foi possível carregar os atributos do Denkynho.', pet: 'Seu Denkynho', level: 'Nível', xp: 'XP', attributes: 'Atributos', satiety: 'Saciedade', energy: 'Energia', happiness: 'Alegria', hygiene: 'Higiene', emotion: 'Humor', empathy: 'Acompanha o que você sente', needsMood: 'De acordo com o cuidado', reveal: 'Mostrar resposta completa', message: 'Sua mensagem', placeholder: 'Escreva sua dúvida…', hint: 'Enter envia · Shift+Enter quebra a linha. Não envie senhas ou códigos.', thinking: 'Pensando…', send: 'Enviar mensagem', invalid: 'Escreva uma pergunta de até 1.000 caracteres.', blocked: 'Essa mensagem contém uma palavra que não pode ser usada no chat. Reformule de modo respeitoso.', language: 'Idioma',
  },
  en: {
    title: 'Help', eyebrow: 'Chat with Denkynho', description: 'Guidance for your PDL journey.', support: 'Contact the team', companion: 'Your PDL companion', ask: 'How can I help you?', searching: 'Looking for guidance…', talking: 'Talking with you…', idle: 'Enjoying a quiet moment.', caring: 'Taking care of Denkynho…', animate: 'Animate character', reduced: 'Reduced motion is enabled on your device.', faq: 'Browse the FAQ', chat: "Let's talk", context: 'Context is kept while this conversation remains open', fresh: 'New conversation', assistant: 'Your assistant', chatLabel: 'Help chat', messages: 'Conversation messages', you: 'You', full: 'View full guidance', source: 'Source', related: 'You may also want to know:', topic: 'Topic', all: 'All topics', loading: 'Loading help topics…', empty: 'No help topics are published yet. The support team is available.', consulting: 'Searching the help center…', error: 'The help center could not be reached.', petLoading: 'Loading Denkynho attributes…', petError: 'Denkynho attributes could not be loaded.', pet: 'Your Denkynho', level: 'Level', xp: 'XP', attributes: 'Attributes', satiety: 'Satiety', energy: 'Energy', happiness: 'Happiness', hygiene: 'Hygiene', emotion: 'Mood', empathy: 'Feeling with you', needsMood: 'According to his care', reveal: 'Show full response', message: 'Your message', placeholder: 'Type your question…', hint: 'Enter sends · Shift+Enter adds a line. Never send passwords or codes.', thinking: 'Thinking…', send: 'Send message', invalid: 'Write a question with up to 1,000 characters.', blocked: 'This message contains language that cannot be used in chat. Please rephrase it respectfully.', language: 'Language',
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
  const faq = useQuery({ queryKey: ['help-faq', user?.id, language], queryFn: async () => helpArticles(await contentApi.authenticatedFaq(language)), retry: false })
  const action = useAsyncAction()
  const petAction = useAsyncAction()
  const petQueryKey = ['denkynho-pet', user?.id] as const
  const pet = useQuery({ queryKey: petQueryKey, queryFn: contentApi.denkynho, enabled: Boolean(user), retry: false })
  const reduced = useReducedMotion()
  const [animations, setAnimations] = useState(true)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<Message[]>(() => [welcome(identity, language, preferences)])
  const resources = useQuery({ queryKey: ['resources'], queryFn: programsApi.resources, staleTime: 15000, retry: false, enabled: Boolean(location.search) || messages.some(message => message.role === 'assistant' && message.text.includes('/painel')) })
  const screenContext = getHelpContext(new URLSearchParams(location.search).get('from'), user, resources.isSuccess ? resources.data : undefined, language)
  const [dialogue, setDialogue] = useState(() => dialogueWithPreferences(language, preferences))
  const [context, setContext] = useState('')
  const [limited, setLimited] = useState(false)
  const [revealing, setRevealing] = useState<Message | null>(null)
  const [shown, setShown] = useState(0)
  const [idle, setIdle] = useState(false)
  const [activity, setActivity] = useState<string | null>(null)
  const [careResult, setCareResult] = useState<ApiDenkynhoCareResult | null>(null)
  const careRetry = useRef<{ action: DenkynhoAction; key: string } | null>(null)
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
  const animated = animations && !reduced
  const busy = action.pending || Boolean(revealing)
  function changeLanguage(next: HelpLanguage) {
    setLanguage(next)
    setContext(''); setLimited(false); session.current++
    setMessages([welcome(identity, next, preferences)])
    setDialogue(dialogueWithPreferences(next, preferences))
    if (preferences) {
      const updated = { ...preferences, language: next }
      setPreferences(updated)
      if (updated.remember && user?.id) storeHelpPreferences(user.id, updated)
    }
    setDraft(''); setValidation(''); setIdle(false); setFailed(false); setModerationBlocked(false); setExpanded(new Set())
  }
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => {
    const felt = pet.data?.emotion
    if (!isDenkynhoEmotion(felt)) return
    const id = felt.id
    setDialogue(current => current.emotion === (id === 'calm' ? undefined : id) ? current : { ...current, emotion: id === 'calm' ? undefined : id })
  }, [pet.data?.emotion])
  useEffect(() => {
    const saved = loadHelpPreferences(user?.id)
    const nextLanguage = saved?.language ?? 'pt'
    setPreferences(saved); setLanguage(nextLanguage)
    session.current++
    setContext(''); setLimited(false); setMessages([welcome(helpIdentity(user), nextLanguage, saved)])
    setDialogue(dialogueWithPreferences(nextLanguage, saved)); setRevealing(null); setDraft(''); setIdle(false)
    setValidation(''); setFailed(false); setModerationBlocked(false); setExpanded(new Set())
    // A mudança de identidade invalida também respostas ainda em trânsito.
    setCareResult(null); setActivity(null); careRetry.current = null
  }, [user?.id, user?.role])
  useEffect(() => {
    if (!activity) return
    const timer = setTimeout(() => setActivity(null), 8000)
    return () => clearTimeout(timer)
  }, [activity])
  useEffect(() => {
    if (busy || petAction.pending || activity || draft || idle) return
    const timer = setTimeout(() => setIdle(true), 45000)
    return () => clearTimeout(timer)
  }, [busy, petAction.pending, messages, draft, activity, idle])
  // Conversar ou iniciar um cuidado encerra a ociosidade e qualquer animação anterior.
  useEffect(() => {
    if (busy || petAction.pending || draft) { setActivity(null); setIdle(false) }
  }, [busy, petAction.pending, draft])
  const finish = useCallback(() => setRevealing(null), [])
  useEffect(() => {
    if (!revealing) return
    if (!animated) { finish(); return }
    const chars = Array.from(revealing.text)
    if (shown >= chars.length) { finish(); return }
    const frame = speechFrame(revealing.text, shown, revealing.pose)
    const timer = setTimeout(() => setShown(count => Math.min(chars.length, count + frame.step)), frame.delay)
    return () => clearTimeout(timer)
  }, [revealing, shown, animated, finish])
  useEffect(() => {
    const node = thread.current
    if (node && followLatest.current) node.scrollTop = node.scrollHeight
  }, [messages, revealing, shown])
  async function send(text = draft, retryId?: number) {
    const question = text.trim()
    if (!question || question.length > 1000) { setValidation(labels.invalid); return }
    if (!moderateChatInput(question).allowed) {
      setValidation(labels.blocked)
      setModerationBlocked(true); setIdle(false)
      return
    }
    if (busy) return
    setValidation(''); setIdle(false); setFailed(false); setModerationBlocked(false)
    const currentSession = session.current
    const messageId = retryId ?? messages.findLast(message => message.role === 'user' && message.status === 'failed' && message.text === question)?.id ?? ++sequence.current
    const result = await action.run(async () => {
      followLatest.current = true
      setDraft(current => current.trim() === question ? '' : current)
      setMessages(previous => previous.some(message => message.id === messageId)
        ? previous.map(message => message.id === messageId ? { ...message, status: 'sending' } : message)
        : [...previous, { id: messageId, role: 'user', text: question, status: 'sending' }])
      const server = await contentApi.assistantReply(question, language, context, preferences && (!context || preferencesDirty.current) ? { preferred_name: preferences.preferred_name, detail: preferences.detail } : undefined)
      if (!server || !['knowledge', 'unknown', 'blocked', 'social'].includes(server.kind) || typeof server.answer?.text !== 'string' || typeof server.answer?.pose !== 'string' || (server.related_ids !== undefined && (!Array.isArray(server.related_ids) || server.related_ids.some(id => typeof id !== 'string')))) throw new Error(labels.error)
      if ((server.context !== undefined && typeof server.context !== 'string') || (server.mode !== undefined && !['generative', 'limited'].includes(server.mode))) throw new Error(labels.error)
      if (server.emotion !== undefined && !isDenkynhoEmotion(server.emotion)) throw new Error(labels.error)
      return { server, dialogue: server.kind !== 'blocked' && server.mode !== 'generative' && isLocalDialogueMessage(question, dialogue) ? respondToMessage(question, faq.data ?? [], dialogue) : undefined }
    })
    if (!mounted.current || currentSession !== session.current) return
    if (!result.ok) {
      if (!result.skipped) {
        setFailed(true)
        setMessages(previous => previous.map(message => message.id === messageId ? { ...message, status: 'failed' } : message))
        setDraft(current => current || question)
      }
      return
    }
    if (result.value.server?.kind === 'blocked') {
      setValidation(result.value.server.answer.text); setModerationBlocked(true)
      setMessages(previous => previous.filter(message => message.id !== messageId))
      setDraft(current => current || question)
      return
    }
    preferencesDirty.current = false
    setContext(result.value.server.context ?? '')
    setLimited(result.value.server.mode !== 'generative')
    const felt = isDenkynhoEmotion(result.value.server.emotion) ? result.value.server.emotion : undefined
    if (felt) queryClient.setQueryData(petQueryKey, current => current ? { ...current, emotion: felt } : current)
    const resolved = result.value.dialogue ?? {
      answer: {
        ...result.value.server!.answer,
        text: dialogue.detailPreference === 'detailed' ? result.value.server!.answer.details || result.value.server!.answer.text : result.value.server!.answer.text,
        details: dialogue.detailPreference === 'balanced' ? result.value.server!.answer.details ?? undefined : undefined,
        related: (result.value.server!.related_ids ?? []).map(id => faq.data?.find(item => item.id === id)).filter((item): item is HelpArticle => Boolean(item)),
      },
      state: { ...dialogue, turn: dialogue.turn + 1, lastArticleId: result.value.server!.article_id, pendingChoiceIds: result.value.server!.related_ids ?? [], emotion: felt?.id ?? dialogue.emotion },
    }
    if (felt && result.value.dialogue) resolved.state = { ...resolved.state, emotion: felt.id }
    const reply: Message = { id: ++sequence.current, role: 'assistant', ...resolved.answer }
    setDialogue(resolved.state)
    setMessages(previous => [...previous.map(message => message.id === messageId ? { ...message, status: undefined } : message), reply])
    setShown(0); setRevealing(animated ? reply : null)
  }
  async function careFor(item: typeof activities[number], onActivity: () => void) {
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
    setIdle(false); setActivity(item.pose); onActivity()
  }
  function submit(event: FormEvent) { event.preventDefault(); void send() }
  function onDraftKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    if (!draft.trim() || busy) return
    void send()
  }
  const categories = Array.from(new Map((faq.data ?? []).map(item => [item.category, item.category_label])).entries())
  const suggestions = (faq.data ?? []).filter(item => topic === 'all' || item.category === topic).slice(0, 4)
  const last = messages[messages.length - 1]
  const emotion = isDenkynhoEmotion(pet.data?.emotion) ? pet.data.emotion : defaultDenkynhoEmotion
  const emotionPose = emotion.idle_pose
  const pose = action.pending ? '03-pensando' : moderationBlocked ? '10-frustrado' : failed ? '07-triste' : revealing ? last.pose ?? emotionPose : activity ?? ((idle || last.id === 0) ? emotionPose : last.pose ?? emotionPose)
  const currentActivity = activities.find(item => item.pose === pose)
  const companionStatus = petAction.pending ? labels.caring : action.pending ? labels.searching : revealing ? labels.talking : currentActivity?.status[language] ?? (idle || emotion.id !== 'calm' ? emotionStatus(emotion, language) : labels.ask)
  const petAttributes = pet.data ? [
    { id: 'satiety', label: labels.satiety, value: pet.data.attributes.satiety },
    { id: 'energy', label: labels.energy, value: pet.data.attributes.energy },
    { id: 'happiness', label: labels.happiness, value: pet.data.attributes.happiness },
    { id: 'hygiene', label: labels.hygiene, value: pet.data.attributes.hygiene },
  ] : []
  return <div className="help-page">
    <PageHeader className="help-hero" title={labels.title} eyebrow={<><MessageCircle aria-hidden="true" /> {labels.eyebrow}</>} description={labels.description} actions={<ButtonLink to="/painel/support" variant="secondary" size="sm"><Headphones aria-hidden="true" /> {labels.support}</ButtonLink>} />
    <div className="help-workspace">
      <HelpCompanion faqLink={<ButtonLink to="/faq" variant="secondary" size="sm"><BookOpen aria-hidden="true" /> {labels.faq}</ButtonLink>} language={language} onChat={() => thread.current?.parentElement?.querySelector('textarea')?.focus()} status={companionStatus}
        mascot={<Denkynho pose={pose} idle={idle} animated={animated} appearance={pet.data?.appearance} celebration={Boolean(activity && careResult?.level_up && !careResult.replayed)} dancing={activity === "02-sucesso" && careResult?.action === "dance"} talking={Boolean(revealing)} mouthOpen={speechFrame(revealing?.text ?? '', shown, revealing?.pose).mouthOpen} />}>
        {onActivity => <>
        {pet.isLoading && <LoadingState className="denk-pet-loading">{labels.petLoading}</LoadingState>}
        {pet.data && <section className="denk-pet-panel" aria-label={labels.pet}>
          <header><strong>{labels.level} {pet.data.level}</strong><small>{labels.xp} {pet.data.experience}/{pet.data.experience_next}</small></header>
          <p className="denk-pet-emotion"><strong>{labels.emotion}: {emotionLabel(emotion.id, language)}</strong><small className="muted">{emotion.source === 'user' ? labels.empathy : labels.needsMood}</small></p>
          <div className="denk-pet-attributes" aria-label={labels.attributes}>
            {petAttributes.map(attribute => <div key={attribute.id}><span>{attribute.label}</span><progress aria-label={attribute.label} max={100} value={attribute.value}>{attribute.value}%</progress><b>{attribute.value}</b></div>)}
          </div>
        </section>}
        <ErrorNotice error={pet.error ?? petAction.error} fallback={labels.petError} className="denk-pet-error" />
        <div className="help-activities" role="group" aria-label={language === 'pt' ? 'Atividades do Denkynho' : 'Denkynho activities'}>
          {activities.filter(item => item.action !== 'dance' || pet.data?.available_actions?.includes('dance')).map(item => <Button key={item.pose} size="sm" variant="secondary" disabled={busy || petAction.pending || pet.isLoading || pet.isError || Boolean(draft) || failed || moderationBlocked || activity === item.pose} aria-pressed={activity === item.pose} onClick={() => { void careFor(item, onActivity) }}>{item[language]}</Button>)}
        </div>
        {pet.data?.unlocks && <PetProgress key={user?.id} profile={pet.data} language={language} careResult={careResult} disabled={busy || petAction.pending} onProfileChange={updated => queryClient.setQueryData(petQueryKey, updated)} />}
        <Toggle label={labels.animate} checked={animated} disabled={reduced} onChange={event => setAnimations(event.target.checked)} />
        {reduced && <small className="muted">{labels.reduced}</small>}
        <Field label={labels.language}><select value={language} disabled={busy || petAction.pending} onChange={event => changeLanguage(event.target.value as HelpLanguage)}><option value="pt">Português</option><option value="en">English</option></select></Field>
        {user && <HelpPreferences key={`${user.id}-${language}`} userId={user.id} language={language} value={preferences} disabled={busy || petAction.pending} onApply={next => {
          preferencesDirty.current = true
          setPreferences(next)
          setDialogue(current => ({ ...current, name: next.preferred_name || undefined, detailPreference: next.detail === 'brief' ? 'short' : next.detail }))
          // Explicit erasure must also forget the name in the temporary signed context.
          if (!next.preferred_name) setContext('')
        }} />}
        </>}
      </HelpCompanion>
      <Card as="section" className="help-chat" aria-label={labels.chatLabel}>
        <header className="help-chat-head"><div><h2>{labels.chat}</h2><p className="muted">{labels.context}</p>{limited && <p role="status">{language === 'pt' ? 'Estou no modo de ajuda básica. A conversa com IA está indisponível no momento.' : 'Basic help mode is active. AI conversation is currently unavailable.'}</p>}</div><Button size="sm" variant="secondary" disabled={busy} onClick={() => { session.current++; setContext(''); setLimited(false); setMessages([welcome(identity, language, preferences)]); setDialogue(dialogueWithPreferences(language, preferences)); setDraft(''); setValidation(''); setIdle(false); setFailed(false); setModerationBlocked(false); setExpanded(new Set()); followLatest.current = true }}>{labels.fresh}</Button></header>
        <div className="help-messages" ref={thread} onScroll={event => { const node = event.currentTarget; followLatest.current = node.scrollHeight - node.scrollTop - node.clientHeight < 64 }} role="log" aria-label={labels.messages} aria-live="polite" aria-relevant="additions">
          {screenContext && messages.length === 1 && <section className="help-context"><strong>{screenContext.title}</strong><p>{screenContext.tip}</p><Button size="sm" variant="secondary" disabled={busy} onClick={() => { setDraft(screenContext.suggestion); thread.current?.parentElement?.querySelector('textarea')?.focus() }}>{screenContext.suggestion}</Button><div className="help-activities">{screenContext.actions.map(item => <ButtonLink key={item.to} size="sm" variant="secondary" to={item.to}>{item.label}</ButtonLink>)}</div></section>}
          {messages.map(message => <article key={message.id} className={`help-message from-${message.role}`}>
            <strong>{message.role === 'user' ? labels.you : 'Denkynho'}</strong>
            {revealing?.id === message.id ? <><p aria-hidden="true">{Array.from(message.text).slice(0, shown).join('') || '…'}</p><p className="help-sr">{message.text}</p></> : <p>{message.text}</p>}
            {message.status === 'sending' && <small className="muted">{language === 'pt' ? 'Preparando sua resposta…' : 'Preparing your response…'}</small>}
            {message.status === 'failed' && <div className="help-message-retry"><small>{language === 'pt' ? 'Não foi possível responder.' : 'Could not get a reply.'}</small><Button size="sm" variant="secondary" disabled={busy} onClick={() => void send(message.text, message.id)}>{language === 'pt' ? 'Reenviar mensagem' : 'Retry message'}</Button></div>}
            {message.details && <Button size="sm" variant="secondary" onClick={() => setExpanded(current => new Set(current).add(message.id))} disabled={expanded.has(message.id)}>{labels.full}</Button>}
            {message.details && expanded.has(message.id) && <p className="help-details">{message.details}</p>}
            {message.followUp && <p className="help-follow-up">{message.followUp}</p>}
            {message.role === 'assistant' && message.id !== revealing?.id && <div className="help-activities">{getHelpActionsForText(`${message.text} ${message.details ?? ''}`, user, resources.isSuccess ? resources.data : undefined, language).map(item => <ButtonLink key={item.to} size="sm" variant="secondary" to={item.to}>{item.label}</ButtonLink>)}</div>}
            {message.source && <small className="muted">{labels.source}: {message.source}</small>}
            {message.related?.length ? <div className="help-related" aria-label={labels.related}><small className="muted">{labels.related}</small>{message.related.map(item => <Button key={item.id} size="sm" variant="secondary" disabled={busy} onClick={() => void send(item.question)}>{item.question}</Button>)}</div> : null}
          </article>)}
          {messages.length === 1 && Boolean(faq.data?.length) && <div className="help-topic"><Field label={labels.topic}><select value={topic} onChange={event => setTopic(event.target.value)}><option value="all">{labels.all}</option>{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field></div>}
          {messages.length === 1 && suggestions.length > 0 && <div className="help-suggestions" aria-label="Perguntas sugeridas">{suggestions.map(item => <Button key={item.id} variant="secondary" size="sm" disabled={busy} onClick={() => void send(item.question)}>{item.question}{item.audience && item.audience !== 'public' ? ` · ${item.audience_label}` : ''}</Button>)}</div>}
        </div>
        <div className="help-chat-status">
          {activity && careResult && !careResult.replayed && <p role="status" className="denk-care-gains">{language === 'pt' ? ['Que boa pausa!', 'Adorei esse cuidado!', 'Pronto para continuar!'][careResult.experience % 3] : ['That was a good break!', 'Thanks for the care!', 'Ready to carry on!'][careResult.experience % 3]} +{careResult.xp_gained} XP{careResult.level_up ? (language === 'pt' ? ` · Cheguei ao nível ${careResult.level}!` : ` · I reached level ${careResult.level}!`) : ''}</p>}
          {faq.isLoading && <LoadingState>{labels.loading}</LoadingState>}
          <ErrorNotice error={faq.error} onRetry={() => { void faq.refetch() }} />
          {faq.isSuccess && !faq.data.length && <EmptyState>{labels.empty}</EmptyState>}
          {action.pending && <LoadingState>{labels.consulting}</LoadingState>}
          <ErrorNotice error={failed && action.error} fallback={labels.error} />
          {revealing && <div className="help-reveal"><Button size="sm" variant="secondary" onClick={finish}>{labels.reveal}</Button></div>}
        </div>
        <form className="help-compose" onSubmit={submit}>
          <Field className="help-compose-field" label={<span className="help-compose-label">{labels.message}</span>} error={validation && <span id="help-validation">{validation}</span>}><textarea value={draft} onChange={event => { setDraft(event.target.value); if (validation) { setValidation(''); setModerationBlocked(false) } }} onKeyDown={onDraftKey} maxLength={1000} rows={2} placeholder={busy ? (language === 'pt' ? 'Você já pode escrever a próxima mensagem…' : 'You can draft your next message…') : labels.placeholder} enterKeyHint="send" aria-invalid={Boolean(validation)} aria-describedby={validation ? 'help-validation' : undefined} /></Field>
          <div className="help-compose-actions"><small className="muted help-compose-hint">{labels.hint}</small><Button type="submit" size="sm" busy={action.pending} busyLabel={labels.thinking} disabled={busy || !draft.trim() || faq.isLoading}><Send aria-hidden="true" /> <span className="help-compose-send-label">{labels.send}</span></Button></div>
        </form>
      </Card>
    </div>
  </div>
}
