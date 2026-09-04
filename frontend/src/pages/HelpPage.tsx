import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
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
import { answerQuestion, helpArticles } from '../components/help/answers'
import { Denkynho } from '../components/help/Denkynho'
import { useReducedMotion } from '../components/help/useReducedMotion'

type Message = { id: number; role: 'user' | 'assistant'; text: string; source?: string; pose?: string }
const welcome: Message = { id: 0, role: 'assistant', text: 'Olá! Sou o Denkynho. Conte sua dúvida ou escolha uma pergunta abaixo. Vou procurar uma orientação na base de ajuda do PDL.', pose: '01-boas-vindas' }

/** Central de ajuda autenticada. Conversa temporária, baseada apenas no FAQ publicado. */
export function HelpPage() {
  const faq = useQuery({ queryKey: ['help-faq'], queryFn: async () => helpArticles(await contentApi.faq()), retry: false })
  const action = useAsyncAction()
  const reduced = useReducedMotion()
  const [animations, setAnimations] = useState(true)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<Message[]>([welcome])
  const [revealing, setRevealing] = useState<Message | null>(null)
  const [shown, setShown] = useState(0)
  const [sleeping, setSleeping] = useState(false)
  const [validation, setValidation] = useState('')
  const [failed, setFailed] = useState(false)
  const sequence = useRef(0)
  const mounted = useRef(true)
  const bottom = useRef<HTMLDivElement>(null)
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
    const delay = /[.!?,;:]/.test(chars[Math.max(0, shown - 1)]) ? 220 : 35
    const timer = setTimeout(() => setShown(count => Math.min(chars.length, count + 3)), delay)
    return () => clearTimeout(timer)
  }, [revealing, shown, animated, finish])
  useEffect(() => { bottom.current?.scrollIntoView?.({ block: 'nearest' }) }, [messages, revealing])
  async function send(text = draft) {
    const question = text.trim()
    if (!question || question.length > 1000) { setValidation('Escreva uma pergunta de até 1.000 caracteres.'); return }
    if (busy) return
    setValidation(''); setSleeping(false); setFailed(false)
    const result = await action.run(async () => {
      const data = helpArticles(await contentApi.faq())
      return answerQuestion(question, data)
    })
    if (!mounted.current) return
    if (!result.ok) { if (!result.skipped) setFailed(true); return }
    const reply: Message = { id: ++sequence.current, role: 'assistant', ...result.value }
    setMessages(previous => [...previous, { id: ++sequence.current, role: 'user', text: question }, reply])
    setDraft(''); setShown(0); setRevealing(animated ? reply : null)
  }
  function submit(event: FormEvent) { event.preventDefault(); void send() }
  const last = messages[messages.length - 1]
  const pose = action.pending ? '03-pensando' : failed ? '07-triste' : sleeping ? '05-dormindo' : last.pose ?? '01-boas-vindas'
  return <div className="help-page">
    <PageHeader title="Ajuda" eyebrow={<><MessageCircle aria-hidden="true" /> Converse com o Denkynho</>} description="Encontre orientações para sua jornada no PDL." actions={<ButtonLink to="/painel/support" variant="secondary"><Headphones aria-hidden="true" /> Atendimento da equipe</ButtonLink>} />
    <div className="help-workspace">
      <Card as="aside" className="help-companion" aria-label="Seu assistente">
        <div><span className="panel-eyebrow">Seu companheiro no PDL</span><h2>Denkynho</h2></div>
        <Denkynho pose={pose} animated={animated} talking={Boolean(revealing)} mouthOpen={shown % 6 >= 3} />
        <p className="muted">{action.pending ? 'Procurando uma orientação…' : revealing ? 'Conversando com você…' : sleeping ? 'Descansando. Escreva para me chamar.' : 'Como posso ajudar você?'}</p>
        <Toggle label="Animar personagem" checked={animated} disabled={reduced} onChange={event => setAnimations(event.target.checked)} />
        {reduced && <small className="muted">Movimento reduzido ativado no seu dispositivo.</small>}
        <ButtonLink to="/faq" variant="secondary" size="sm"><BookOpen aria-hidden="true" /> Consultar o FAQ</ButtonLink>
      </Card>
      <Card as="section" className="help-chat" aria-label="Chat de ajuda">
        <header className="help-chat-head"><div><h2>Vamos conversar</h2><p className="muted">Respostas da base de ajuda · conversa temporária</p></div><Button size="sm" variant="secondary" disabled={busy} onClick={() => { setMessages([welcome]); setDraft(''); setValidation(''); setSleeping(false); setFailed(false) }}>Nova conversa</Button></header>
        <div className="help-messages" role="log" aria-label="Mensagens da conversa" aria-live="polite" aria-relevant="additions">
          {messages.map(message => <article key={message.id} className={`help-message from-${message.role}`}>
            <strong>{message.role === 'user' ? 'Você' : 'Denkynho'}</strong>
            {revealing?.id === message.id ? <><p aria-hidden="true">{Array.from(message.text).slice(0, shown).join('') || '…'}</p><p className="help-sr">{message.text}</p></> : <p>{message.text}</p>}
            {message.source && <small className="muted">Fonte: {message.source}</small>}
          </article>)}<div ref={bottom} />
        </div>
        {faq.isLoading && <LoadingState>Carregando perguntas de ajuda…</LoadingState>}
        <ErrorNotice error={faq.error} onRetry={() => { void faq.refetch() }} />
        {faq.isSuccess && !faq.data.length && <EmptyState>Ainda não há perguntas publicadas. O atendimento da equipe está disponível.</EmptyState>}
        {messages.length === 1 && Boolean(faq.data?.length) && <div className="help-suggestions" aria-label="Perguntas sugeridas">{faq.data!.slice(0, 4).map(item => <div className="help-suggestion" key={item.id}><span>{item.question}</span><Button aria-label={item.question} variant="secondary" size="sm" disabled={busy} onClick={() => { setDraft(item.question); void send(item.question) }}>Perguntar</Button></div>)}</div>}
        {action.pending && <LoadingState>Consultando a base de ajuda…</LoadingState>}
        <ErrorNotice error={failed && action.error} fallback="Não foi possível consultar a ajuda." />
        {revealing && <div className="help-reveal"><Button size="sm" variant="secondary" onClick={finish}>Mostrar resposta completa</Button></div>}
        <form className="help-compose" onSubmit={submit}>
          <Field label="Sua mensagem" error={validation && <span id="help-validation">{validation}</span>}><textarea value={draft} onChange={event => setDraft(event.target.value)} maxLength={1000} rows={3} placeholder="Escreva sua dúvida…" disabled={busy} aria-invalid={Boolean(validation)} aria-describedby={validation ? 'help-validation' : undefined} /></Field>
          <div className="help-compose-actions"><small className="muted">Não envie senhas ou códigos de acesso.</small><Button type="submit" busy={action.pending} busyLabel="Consultando…" disabled={busy || !draft.trim() || faq.isLoading}><Send aria-hidden="true" /> Enviar mensagem</Button></div>
        </form>
      </Card>
    </div>
  </div>
}
