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
import { useReducedMotion } from '../components/help/useReducedMotion'
import { denkynhoWelcome } from '../components/help/personality'
import { initialDialogueState, isLocalDialogueMessage, respondToMessage } from '../components/help/dialogue'
import { speechFrame } from '../components/help/speech'
import { useAuth } from '../contexts/AuthContext'
import { helpIdentity, type HelpIdentity } from '../components/help/identity'
import { moderateChatInput } from '../components/help/moderation'

type Message = { id: number; role: 'user' | 'assistant'; text: string; details?: string; followUp?: string; source?: string; related?: HelpArticle[]; pose?: string }
const welcome = (identity: HelpIdentity): Message => ({ id: 0, role: 'assistant', text: denkynhoWelcome(new Date(), identity), pose: '01-boas-vindas' })

/** Central de ajuda autenticada. Conversa temporária, baseada apenas no FAQ publicado. */
export function HelpPage() {
  const { user } = useAuth()
  const identity = helpIdentity(user)
  const faq = useQuery({ queryKey: ['help-faq', user?.id], queryFn: async () => helpArticles(await contentApi.authenticatedFaq()), retry: false })
  const action = useAsyncAction()
  const reduced = useReducedMotion()
  const [animations, setAnimations] = useState(true)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<Message[]>(() => [welcome(identity)])
  const [dialogue, setDialogue] = useState(initialDialogueState)
  const [revealing, setRevealing] = useState<Message | null>(null)
  const [shown, setShown] = useState(0)
  const [sleeping, setSleeping] = useState(false)
  const [validation, setValidation] = useState('')
  const [failed, setFailed] = useState(false)
  const [moderationBlocked, setModerationBlocked] = useState(false)
  const [topic, setTopic] = useState('all')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const sequence = useRef(0)
  const mounted = useRef(true)
  const thread = useRef<HTMLDivElement>(null)
  const animated = animations && !reduced
  const busy = action.pending || Boolean(revealing)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => {
    setSleeping(false)
    if (busy) return
    const timer = setTimeout(() => setSleeping(true), 45000)
    return () => clearTimeout(timer)
  }, [busy, messages, draft])
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
    if (!question || question.length > 1000) { setValidation('Escreva uma pergunta de até 1.000 caracteres.'); return }
    if (!moderateChatInput(question).allowed) {
      setValidation('Essa mensagem contém uma palavra que não pode ser usada no chat. Reformule de modo respeitoso.')
      setModerationBlocked(true); setSleeping(false)
      return
    }
    if (busy) return
    setValidation(''); setSleeping(false); setFailed(false); setModerationBlocked(false)
    const local = isLocalDialogueMessage(question, dialogue)
    const result = await action.run(async () => {
      const data = local ? (faq.data ?? []) : helpArticles(await contentApi.authenticatedFaq())
      if (local) await new Promise(resolve => setTimeout(resolve, 160))
      return respondToMessage(question, data, dialogue)
    })
    if (!mounted.current) return
    if (!result.ok) { if (!result.skipped) setFailed(true); return }
    const reply: Message = { id: ++sequence.current, role: 'assistant', ...result.value.answer }
    setDialogue(result.value.state)
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
  const pose = action.pending ? '03-pensando' : moderationBlocked ? '10-frustrado' : failed ? '07-triste' : sleeping ? '05-dormindo' : last.pose ?? '01-boas-vindas'
  return <div className="help-page">
    <PageHeader className="help-hero" title="Ajuda" eyebrow={<><MessageCircle aria-hidden="true" /> Converse com o Denkynho</>} description="Orientações para sua jornada no PDL." actions={<ButtonLink to="/painel/support" variant="secondary" size="sm"><Headphones aria-hidden="true" /> Atendimento da equipe</ButtonLink>} />
    <div className="help-workspace">
      <Card as="aside" className="help-companion" aria-label="Seu assistente">
        <div><span className="panel-eyebrow">Seu companheiro no PDL</span><h2>Denkynho</h2></div>
        <Denkynho pose={pose} animated={animated} talking={Boolean(revealing)} mouthOpen={speechFrame(revealing?.text ?? '', shown, revealing?.pose).mouthOpen} />
        <p className="muted">{action.pending ? 'Procurando uma orientação…' : revealing ? 'Conversando com você…' : sleeping ? 'Descansando. Escreva para me chamar.' : 'Como posso ajudar você?'}</p>
        <Toggle label="Animar personagem" checked={animated} disabled={reduced} onChange={event => setAnimations(event.target.checked)} />
        {reduced && <small className="muted">Movimento reduzido ativado no seu dispositivo.</small>}
        <ButtonLink to="/faq" variant="secondary" size="sm"><BookOpen aria-hidden="true" /> Consultar o FAQ</ButtonLink>
      </Card>
      <Card as="section" className="help-chat" aria-label="Chat de ajuda">
        <header className="help-chat-head"><div><h2>Vamos conversar</h2><p className="muted">O contexto vale enquanto esta conversa estiver aberta</p></div><Button size="sm" variant="secondary" disabled={busy} onClick={() => { setMessages([welcome(identity)]); setDialogue(initialDialogueState()); setDraft(''); setValidation(''); setSleeping(false); setFailed(false); setModerationBlocked(false); setExpanded(new Set()) }}>Nova conversa</Button></header>
        <div className="help-messages" ref={thread} role="log" aria-label="Mensagens da conversa" aria-live="polite" aria-relevant="additions">
          {messages.map(message => <article key={message.id} className={`help-message from-${message.role}`}>
            <strong>{message.role === 'user' ? 'Você' : 'Denkynho'}</strong>
            {revealing?.id === message.id ? <><p aria-hidden="true">{Array.from(message.text).slice(0, shown).join('') || '…'}</p><p className="help-sr">{message.text}</p></> : <p>{message.text}</p>}
            {message.details && <Button size="sm" variant="secondary" onClick={() => setExpanded(current => new Set(current).add(message.id))} disabled={expanded.has(message.id)}>Ver orientação completa</Button>}
            {message.details && expanded.has(message.id) && <p className="help-details">{message.details}</p>}
            {message.followUp && <p className="help-follow-up">{message.followUp}</p>}
            {message.source && <small className="muted">Fonte: {message.source}</small>}
            {message.related?.length ? <div className="help-related" aria-label="Assuntos relacionados"><small className="muted">Talvez você queira saber:</small>{message.related.map(item => <Button key={item.id} size="sm" variant="secondary" disabled={busy} onClick={() => void send(item.question)}>{item.question}</Button>)}</div> : null}
          </article>)}
          {messages.length === 1 && Boolean(faq.data?.length) && <div className="help-topic"><Field label="Assunto"><select value={topic} onChange={event => setTopic(event.target.value)}><option value="all">Todos os assuntos</option>{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field></div>}
          {messages.length === 1 && suggestions.length > 0 && <div className="help-suggestions" aria-label="Perguntas sugeridas">{suggestions.map(item => <Button key={item.id} variant="secondary" size="sm" disabled={busy} onClick={() => void send(item.question)}>{item.question}{item.audience && item.audience !== 'public' ? ` · ${item.audience_label}` : ''}</Button>)}</div>}
        </div>
        <div className="help-chat-status">
          {faq.isLoading && <LoadingState>Carregando perguntas de ajuda…</LoadingState>}
          <ErrorNotice error={faq.error} onRetry={() => { void faq.refetch() }} />
          {faq.isSuccess && !faq.data.length && <EmptyState>Ainda não há perguntas publicadas. O atendimento da equipe está disponível.</EmptyState>}
          {action.pending && <LoadingState>Consultando a base de ajuda…</LoadingState>}
          <ErrorNotice error={failed && action.error} fallback="Não foi possível consultar a ajuda." />
          {revealing && <div className="help-reveal"><Button size="sm" variant="secondary" onClick={finish}>Mostrar resposta completa</Button></div>}
        </div>
        <form className="help-compose" onSubmit={submit}>
          <Field label="Sua mensagem" error={validation && <span id="help-validation">{validation}</span>}><textarea value={draft} onChange={event => { setDraft(event.target.value); if (validation) { setValidation(''); setModerationBlocked(false) } }} onKeyDown={onDraftKey} maxLength={1000} rows={2} placeholder="Escreva sua dúvida…" disabled={busy} enterKeyHint="send" aria-invalid={Boolean(validation)} aria-describedby={validation ? 'help-validation' : undefined} /></Field>
          <div className="help-compose-actions"><small className="muted">Enter envia · Shift+Enter quebra a linha. Não envie senhas ou códigos.</small><Button type="submit" busy={action.pending} busyLabel="Pensando…" disabled={busy || !draft.trim() || faq.isLoading}><Send aria-hidden="true" /> Enviar mensagem</Button></div>
        </form>
      </Card>
    </div>
  </div>
}
