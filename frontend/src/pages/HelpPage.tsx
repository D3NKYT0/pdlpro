import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, Headphones, MessageCircle, Send } from 'lucide-react'
import { contentApi } from '../services/api'
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
import { denkynhoWelcome, type HelpLanguage } from '../components/help/personality'
import { initialDialogueState, isLocalDialogueMessage, respondToMessage } from '../components/help/dialogue'
import { speechFrame } from '../components/help/speech'
import { useAuth } from '../contexts/AuthContext'
import { helpIdentity, type HelpIdentity } from '../components/help/identity'
import { moderateChatInput } from '../components/help/moderation'

type Message = { id: number; role: 'user' | 'assistant'; text: string; details?: string; followUp?: string; source?: string; related?: HelpArticle[]; pose?: string }
const welcome = (identity: HelpIdentity, language: HelpLanguage): Message => ({ id: 0, role: 'assistant', text: denkynhoWelcome(new Date(), identity, language), pose: '01-boas-vindas' })
const activities = [
  { pose: '11-comendo', pt: 'Comer', en: 'Eat', status: { pt: 'Fazendo uma pausa para um lanche.', en: 'Taking a snack break.' } },
  { pose: '12-jogando', pt: 'Jogar', en: 'Play', status: { pt: 'Jogando uma partida enquanto espero você.', en: 'Playing a game while I wait for you.' } },
  { pose: '06-rindo', pt: 'Rir', en: 'Laugh', status: { pt: 'Dando uma boa risada!', en: 'Having a good laugh!' } },
  { pose: '02-sucesso', pt: 'Comemorar', en: 'Celebrate', status: { pt: 'Comemorando com você!', en: 'Celebrating with you!' } },
] as const

const copy = {
  pt: {
    title: 'Ajuda', eyebrow: 'Converse com o Denkynho', description: 'Orientações para sua jornada no PDL.', support: 'Atendimento da equipe', companion: 'Seu companheiro no PDL', ask: 'Como posso ajudar você?', searching: 'Procurando uma orientação…', talking: 'Conversando com você…', sleeping: 'Descansando. Escreva para me chamar.', animate: 'Animar personagem', reduced: 'Movimento reduzido ativado no seu dispositivo.', faq: 'Consultar o FAQ', chat: 'Vamos conversar', context: 'O contexto vale enquanto esta conversa estiver aberta', fresh: 'Nova conversa', assistant: 'Seu assistente', chatLabel: 'Chat de ajuda', messages: 'Mensagens da conversa', you: 'Você', full: 'Ver orientação completa', source: 'Fonte', related: 'Talvez você queira saber:', topic: 'Assunto', all: 'Todos os assuntos', loading: 'Carregando perguntas de ajuda…', empty: 'Ainda não há perguntas publicadas. O atendimento da equipe está disponível.', consulting: 'Consultando a base de ajuda…', error: 'Não foi possível consultar a ajuda.', reveal: 'Mostrar resposta completa', message: 'Sua mensagem', placeholder: 'Escreva sua dúvida…', hint: 'Enter envia · Shift+Enter quebra a linha. Não envie senhas ou códigos.', thinking: 'Pensando…', send: 'Enviar mensagem', invalid: 'Escreva uma pergunta de até 1.000 caracteres.', blocked: 'Essa mensagem contém uma palavra que não pode ser usada no chat. Reformule de modo respeitoso.', language: 'Idioma',
  },
  en: {
    title: 'Help', eyebrow: 'Chat with Denkynho', description: 'Guidance for your PDL journey.', support: 'Contact the team', companion: 'Your PDL companion', ask: 'How can I help you?', searching: 'Looking for guidance…', talking: 'Talking with you…', sleeping: 'Resting. Send a message to wake me up.', animate: 'Animate character', reduced: 'Reduced motion is enabled on your device.', faq: 'Browse the FAQ', chat: "Let's talk", context: 'Context is kept while this conversation remains open', fresh: 'New conversation', assistant: 'Your assistant', chatLabel: 'Help chat', messages: 'Conversation messages', you: 'You', full: 'View full guidance', source: 'Source', related: 'You may also want to know:', topic: 'Topic', all: 'All topics', loading: 'Loading help topics…', empty: 'No help topics are published yet. The support team is available.', consulting: 'Searching the help center…', error: 'The help center could not be reached.', reveal: 'Show full response', message: 'Your message', placeholder: 'Type your question…', hint: 'Enter sends · Shift+Enter adds a line. Never send passwords or codes.', thinking: 'Thinking…', send: 'Send message', invalid: 'Write a question with up to 1,000 characters.', blocked: 'This message contains language that cannot be used in chat. Please rephrase it respectfully.', language: 'Language',
  },
} as const

/** Conversa temporária com geração local e fallback explícito para a ajuda editorial. */
export function HelpPage() {
  const { user } = useAuth()
  const identity = helpIdentity(user)
  const [language, setLanguage] = useState<HelpLanguage>('pt')
  const labels = copy[language]
  const faq = useQuery({ queryKey: ['help-faq', user?.id, language], queryFn: async () => helpArticles(await contentApi.authenticatedFaq(language)), retry: false })
  const action = useAsyncAction()
  const reduced = useReducedMotion()
  const [animations, setAnimations] = useState(true)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<Message[]>(() => [welcome(identity, language)])
  const [dialogue, setDialogue] = useState(() => initialDialogueState(language))
  const [context, setContext] = useState('')
  const [limited, setLimited] = useState(false)
  const [revealing, setRevealing] = useState<Message | null>(null)
  const [shown, setShown] = useState(0)
  const [sleeping, setSleeping] = useState(false)
  const [activity, setActivity] = useState<string | null>(null)
  const [activityRequest, setActivityRequest] = useState<{ pose: string } | null>(null)
  const [validation, setValidation] = useState('')
  const [failed, setFailed] = useState(false)
  const [moderationBlocked, setModerationBlocked] = useState(false)
  const [topic, setTopic] = useState('all')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const sequence = useRef(0)
  const mounted = useRef(true)
  const session = useRef(0)
  const thread = useRef<HTMLDivElement>(null)
  const animated = animations && !reduced
  const busy = action.pending || Boolean(revealing)
  function changeLanguage(next: HelpLanguage) {
    setLanguage(next)
    setContext(''); setLimited(false); session.current++
    setMessages([welcome(identity, next)])
    setDialogue(initialDialogueState(next))
    setDraft(''); setValidation(''); setFailed(false); setModerationBlocked(false); setExpanded(new Set())
  }
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => {
    session.current++
    setContext(''); setLimited(false); setMessages([welcome(helpIdentity(user), language)])
    setDialogue(initialDialogueState(language)); setRevealing(null); setDraft('')
    // A mudança de identidade invalida também respostas ainda em trânsito.
  }, [user?.id, user?.role])
  useEffect(() => {
    setSleeping(false)
    setActivity(null)
    if (busy) return
    const timers: ReturnType<typeof setTimeout>[] = []
    if (activityRequest && !draft) {
      setActivity(activityRequest.pose)
      timers.push(setTimeout(() => setActivity(null), 8000))
    }
    if (animated && !draft) {
      for (const [delay, next] of [[12000, '11-comendo'], [22000, '12-jogando'], [34000, '06-rindo'], [39000, null]] as const) {
        timers.push(setTimeout(() => setActivity(next), delay))
      }
    }
    timers.push(setTimeout(() => { setActivity(null); setSleeping(true) }, 45000))
    return () => timers.forEach(clearTimeout)
  }, [busy, messages, draft, animated, activityRequest, language])
  // A conversa interrompe uma ação manual sem retomá-la após a resposta.
  useEffect(() => { setActivityRequest(null) }, [busy, messages, draft, language])
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
    if (node) node.scrollTop = node.scrollHeight
  }, [messages, revealing, shown])
  async function send(text = draft) {
    const question = text.trim()
    if (!question || question.length > 1000) { setValidation(labels.invalid); return }
    if (!moderateChatInput(question).allowed) {
      setValidation(labels.blocked)
      setModerationBlocked(true); setSleeping(false)
      return
    }
    if (busy) return
    setValidation(''); setSleeping(false); setFailed(false); setModerationBlocked(false)
    const currentSession = session.current
    const result = await action.run(async () => {
      const server = await contentApi.assistantReply(question, language, context)
      if (!server || !['knowledge', 'unknown', 'blocked', 'social'].includes(server.kind) || typeof server.answer?.text !== 'string' || typeof server.answer?.pose !== 'string' || (server.related_ids !== undefined && (!Array.isArray(server.related_ids) || server.related_ids.some(id => typeof id !== 'string')))) throw new Error(labels.error)
      if ((server.context !== undefined && typeof server.context !== 'string') || (server.mode !== undefined && !['generative', 'limited'].includes(server.mode))) throw new Error(labels.error)
      return { server, dialogue: server.kind !== 'blocked' && server.mode !== 'generative' && isLocalDialogueMessage(question, dialogue) ? respondToMessage(question, faq.data ?? [], dialogue) : undefined }
    })
    if (!mounted.current || currentSession !== session.current) return
    if (!result.ok) { if (!result.skipped) setFailed(true); return }
    if (result.value.server?.kind === 'blocked') {
      setValidation(result.value.server.answer.text); setModerationBlocked(true)
      return
    }
    setContext(result.value.server.context ?? '')
    setLimited(result.value.server.mode !== 'generative')
    const resolved = result.value.dialogue ?? {
      answer: {
        ...result.value.server!.answer,
        text: dialogue.detailPreference === 'detailed' ? result.value.server!.answer.details || result.value.server!.answer.text : result.value.server!.answer.text,
        details: dialogue.detailPreference === 'balanced' ? result.value.server!.answer.details ?? undefined : undefined,
        related: (result.value.server!.related_ids ?? []).map(id => faq.data?.find(item => item.id === id)).filter((item): item is HelpArticle => Boolean(item)),
      },
      state: { ...dialogue, turn: dialogue.turn + 1, lastArticleId: result.value.server!.article_id, pendingChoiceIds: result.value.server!.related_ids ?? [] },
    }
    const reply: Message = { id: ++sequence.current, role: 'assistant', ...resolved.answer }
    setDialogue(resolved.state)
    setMessages(previous => [...previous, { id: ++sequence.current, role: 'user', text: question }, reply])
    setDraft(''); setShown(0); setRevealing(animated ? reply : null)
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
  const pose = action.pending ? '03-pensando' : moderationBlocked ? '10-frustrado' : failed ? '07-triste' : revealing ? last.pose ?? '01-boas-vindas' : sleeping ? '05-dormindo' : activity ?? last.pose ?? '01-boas-vindas'
  const currentActivity = activities.find(item => item.pose === pose)
  return <div className="help-page">
    <PageHeader className="help-hero" title={labels.title} eyebrow={<><MessageCircle aria-hidden="true" /> {labels.eyebrow}</>} description={labels.description} actions={<ButtonLink to="/painel/support" variant="secondary" size="sm"><Headphones aria-hidden="true" /> {labels.support}</ButtonLink>} />
    <div className="help-workspace">
      <HelpCompanion language={language} onChat={() => thread.current?.parentElement?.querySelector('textarea')?.focus()} status={action.pending ? labels.searching : revealing ? labels.talking : sleeping ? labels.sleeping : currentActivity?.status[language] ?? labels.ask}
        mascot={<Denkynho pose={pose} animated={animated} talking={Boolean(revealing)} mouthOpen={speechFrame(revealing?.text ?? '', shown, revealing?.pose).mouthOpen} />}>
        {onActivity => <>
        <div className="help-activities" role="group" aria-label={language === 'pt' ? 'Atividades do Denkynho' : 'Denkynho activities'}>
          {activities.map(item => <Button key={item.pose} size="sm" variant="secondary" disabled={busy || Boolean(draft) || failed || moderationBlocked || activity === item.pose} aria-pressed={activity === item.pose} onClick={() => { setActivityRequest({ pose: item.pose }); onActivity() }}>{item[language]}</Button>)}
        </div>
        <Toggle label={labels.animate} checked={animated} disabled={reduced} onChange={event => setAnimations(event.target.checked)} />
        {reduced && <small className="muted">{labels.reduced}</small>}
        <Field label={labels.language}><select value={language} disabled={busy} onChange={event => changeLanguage(event.target.value as HelpLanguage)}><option value="pt">Português</option><option value="en">English</option></select></Field>
        <ButtonLink to="/faq" variant="secondary" size="sm"><BookOpen aria-hidden="true" /> {labels.faq}</ButtonLink>
        </>}
      </HelpCompanion>
      <Card as="section" className="help-chat" aria-label={labels.chatLabel}>
        <header className="help-chat-head"><div><h2>{labels.chat}</h2><p className="muted">{labels.context}</p>{limited && <p role="status">{language === 'pt' ? 'Estou no modo de ajuda básica. A conversa com IA local está indisponível no momento.' : 'Basic help mode is active. Local AI conversation is currently unavailable.'}</p>}</div><Button size="sm" variant="secondary" disabled={busy} onClick={() => { session.current++; setContext(''); setLimited(false); setMessages([welcome(identity, language)]); setDialogue(initialDialogueState(language)); setDraft(''); setValidation(''); setSleeping(false); setFailed(false); setModerationBlocked(false); setExpanded(new Set()) }}>{labels.fresh}</Button></header>
        <div className="help-messages" ref={thread} role="log" aria-label={labels.messages} aria-live="polite" aria-relevant="additions">
          {messages.map(message => <article key={message.id} className={`help-message from-${message.role}`}>
            <strong>{message.role === 'user' ? labels.you : 'Denkynho'}</strong>
            {revealing?.id === message.id ? <><p aria-hidden="true">{Array.from(message.text).slice(0, shown).join('') || '…'}</p><p className="help-sr">{message.text}</p></> : <p>{message.text}</p>}
            {message.details && <Button size="sm" variant="secondary" onClick={() => setExpanded(current => new Set(current).add(message.id))} disabled={expanded.has(message.id)}>{labels.full}</Button>}
            {message.details && expanded.has(message.id) && <p className="help-details">{message.details}</p>}
            {message.followUp && <p className="help-follow-up">{message.followUp}</p>}
            {message.source && <small className="muted">{labels.source}: {message.source}</small>}
            {message.related?.length ? <div className="help-related" aria-label={labels.related}><small className="muted">{labels.related}</small>{message.related.map(item => <Button key={item.id} size="sm" variant="secondary" disabled={busy} onClick={() => void send(item.question)}>{item.question}</Button>)}</div> : null}
          </article>)}
          {messages.length === 1 && Boolean(faq.data?.length) && <div className="help-topic"><Field label={labels.topic}><select value={topic} onChange={event => setTopic(event.target.value)}><option value="all">{labels.all}</option>{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field></div>}
          {messages.length === 1 && suggestions.length > 0 && <div className="help-suggestions" aria-label="Perguntas sugeridas">{suggestions.map(item => <Button key={item.id} variant="secondary" size="sm" disabled={busy} onClick={() => void send(item.question)}>{item.question}{item.audience && item.audience !== 'public' ? ` · ${item.audience_label}` : ''}</Button>)}</div>}
        </div>
        <div className="help-chat-status">
          {faq.isLoading && <LoadingState>{labels.loading}</LoadingState>}
          <ErrorNotice error={faq.error} onRetry={() => { void faq.refetch() }} />
          {faq.isSuccess && !faq.data.length && <EmptyState>{labels.empty}</EmptyState>}
          {action.pending && <LoadingState>{labels.consulting}</LoadingState>}
          <ErrorNotice error={failed && action.error} fallback={labels.error} />
          {revealing && <div className="help-reveal"><Button size="sm" variant="secondary" onClick={finish}>{labels.reveal}</Button></div>}
        </div>
        <form className="help-compose" onSubmit={submit}>
          <Field label={labels.message} error={validation && <span id="help-validation">{validation}</span>}><textarea value={draft} onChange={event => { setDraft(event.target.value); if (validation) { setValidation(''); setModerationBlocked(false) } }} onKeyDown={onDraftKey} maxLength={1000} rows={2} placeholder={labels.placeholder} disabled={busy} enterKeyHint="send" aria-invalid={Boolean(validation)} aria-describedby={validation ? 'help-validation' : undefined} /></Field>
          <div className="help-compose-actions"><small className="muted">{labels.hint}</small><Button type="submit" busy={action.pending} busyLabel={labels.thinking} disabled={busy || !draft.trim() || faq.isLoading}><Send aria-hidden="true" /> {labels.send}</Button></div>
        </form>
      </Card>
    </div>
  </div>
}
