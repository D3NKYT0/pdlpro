import { Card } from '../components/ui/Card'
import { TicketMessages } from '../components/support/TicketMessages'
import { apiErrorMessage } from '../lib/errors'
import { TicketStatus } from '../components/support/TicketStatus'
import { formatDateTime } from '../lib/formatters'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Headphones,
  LifeBuoy,
  MessageSquareText,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import { getHelpContext } from '../components/help/contextual'
import { supportApi } from '../services/api'
import type { ApiSupportTicket } from '../services/types'

const categories = [
  ['technical', 'Problema técnico', 'Launcher, site, cliente ou conexão'],
  ['billing', 'Pagamento e loja', 'PIX, saldo, compra ou entrega'],
  ['account', 'Conta e segurança', 'Acesso, e-mail, senha ou proteção'],
  ['game', 'Suporte ao jogo', 'Personagem, item ou situação no servidor'],
  ['bug', 'Relatar um bug', 'Algo não funcionou como deveria'],
  ['report', 'Denúncia', 'Comportamento, fraude ou abuso'],
  ['suggestion', 'Sugestão', 'Ideias para melhorar o servidor'],
  ['other', 'Outro assunto', 'Para tudo que não se encaixa acima'],
] as const

export function SupportPage() {
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const list = useQuery({ queryKey: ['support-tickets'], queryFn: supportApi.list })
  const selectedId = params.get('ticket') ?? ''
  const prefillSubject = params.get('subject') ?? ''
  const prefillFrom = params.get('from')
  const detail = useQuery({
    queryKey: ['support-ticket', selectedId],
    queryFn: () => supportApi.detail(selectedId),
    enabled: Boolean(selectedId),
  })
  const [creating, setCreating] = useState(() => Boolean(prefillSubject || prefillFrom))
  const [subject, setSubject] = useState(() => {
    if (prefillSubject) return prefillSubject.slice(0, 160)
    const screen = getHelpContext(prefillFrom)
    return screen ? `Ajuda: ${screen.title}` : ''
  })
  const [description, setDescription] = useState(() => {
    const screen = getHelpContext(prefillFrom)
    return screen ? `Estou na tela ${screen.title} (${screen.path}) e preciso de ajuda da equipe.` : ''
  })
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState('normal')
  const [reply, setReply] = useState('')
  const [filter, setFilter] = useState<'active' | 'all' | 'closed'>('active')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!params.get('subject') && !params.get('from')) return
    const next = new URLSearchParams(params)
    next.delete('subject')
    next.delete('from')
    setParams(next, { replace: true })
  }, [params, setParams])
  useEffect(() => {
    if (!selectedId && list.data?.results.length && !creating) {
      setParams({ ticket: list.data.results[0].id }, { replace: true })
    }
  }, [creating, list.data?.results, selectedId, setParams])

  const tickets = useMemo(() => {
    const rows = list.data?.results ?? []
    if (filter === 'active') return rows.filter((item) => !['resolved', 'closed'].includes(item.status))
    if (filter === 'closed') return rows.filter((item) => ['resolved', 'closed'].includes(item.status))
    return rows
  }, [filter, list.data?.results])

  async function refresh(ticketId?: string) {
    await queryClient.invalidateQueries({ queryKey: ['support-tickets'] })
    if (ticketId) await queryClient.invalidateQueries({ queryKey: ['support-ticket', ticketId] })
  }

  async function submitTicket(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    try {
      const ticket = await supportApi.create({ subject, description, category, priority })
      toast.success(`Chamado ${ticket.protocol} aberto`)
      setSubject('')
      setDescription('')
      setCategory('')
      setPriority('normal')
      setCreating(false)
      setParams({ ticket: ticket.id })
      await refresh(ticket.id)
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Não foi possível abrir o chamado'))
    } finally {
      setPending(false)
    }
  }

  async function submitReply(event: FormEvent) {
    event.preventDefault()
    if (!selectedId || !reply.trim()) return
    setPending(true)
    try {
      await supportApi.reply(selectedId, reply)
      setReply('')
      toast.success('Mensagem enviada para a equipe')
      await refresh(selectedId)
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Não foi possível enviar a mensagem'))
    } finally {
      setPending(false)
    }
  }

  async function ticketAction(action: 'close' | 'reopen') {
    if (!selectedId) return
    setPending(true)
    try {
      await supportApi.action(selectedId, action)
      toast.success(action === 'close' ? 'Chamado encerrado' : 'Chamado reaberto')
      await refresh(selectedId)
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Não foi possível atualizar o chamado'))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="support-page">
      <Card as="header" className="support-hero">
        <div>
          <span className="panel-eyebrow"><Headphones aria-hidden="true" /> Central de atendimento</span>
          <h1>Como podemos ajudar?</h1>
          <p className="muted">Abra, acompanhe e responda seus chamados em um só lugar.</p>
        </div>
        <Button className="support-new-button" type="button" onClick={() => { setCreating(true); setParams({}) }}>
          <Plus aria-hidden="true" /> Novo chamado
        </Button>
      </Card>

      <section className="support-overview" aria-label="Resumo dos chamados">
        <div className="support-stat"><LifeBuoy /><span><strong>{list.data?.summary.active ?? 0}</strong> em atendimento</span></div>
        <div className="support-stat attention"><CircleAlert /><span><strong>{list.data?.summary.waiting_user ?? 0}</strong> aguardando você</span></div>
        <div className="support-stat done"><CheckCircle2 /><span><strong>{list.data?.summary.resolved ?? 0}</strong> finalizados</span></div>
      </section>

      <div className="support-workspace">
        <aside className={`card support-inbox${creating ? ' is-mobile-hidden' : ''}`}>
          <div className="support-inbox-head">
            <div><span className="panel-eyebrow">Seus chamados</span><h2>Atendimentos</h2></div>
            <button type="button" aria-label="Novo chamado" onClick={() => { setCreating(true); setParams({}) }}><Plus /></button>
          </div>
          <div className="support-filter-tabs">
            <button className={filter === 'active' ? 'active' : ''} type="button" onClick={() => setFilter('active')}>Ativos</button>
            <button className={filter === 'all' ? 'active' : ''} type="button" onClick={() => setFilter('all')}>Todos</button>
            <button className={filter === 'closed' ? 'active' : ''} type="button" onClick={() => setFilter('closed')}>Finalizados</button>
          </div>
          <div className="support-ticket-list">
            {tickets.map((ticket) => (
              <button
                type="button"
                className={`support-ticket-row${selectedId === ticket.id ? ' active' : ''}${ticket.status === 'waiting_user' ? ' needs-reply' : ''}`}
                onClick={() => { setCreating(false); setParams({ ticket: ticket.id }) }}
                key={ticket.id}
              >
                <span className="support-ticket-row-top"><b>{ticket.protocol}</b><small>{formatDateTime(ticket.last_activity_at, 'short')}</small></span>
                <strong>{ticket.subject}</strong>
                <span className="support-ticket-row-bottom"><TicketStatus ticket={ticket} /><small>{ticket.message_count ?? 0} mensagens</small></span>
              </button>
            ))}
            {!list.isLoading && !tickets.length ? (
              <div className="support-empty-mini"><MessageSquareText /><strong>Nenhum chamado aqui</strong><span>Quando precisar, nossa equipe estará por perto.</span></div>
            ) : null}
          </div>
        </aside>

        <main className={`card support-main${creating || selectedId ? ' is-open' : ''}`}>
          {creating ? (
            <form className="support-create" onSubmit={submitTicket}>
              <div className="support-main-head">
                <div><span className="panel-eyebrow">Novo atendimento</span><h2>Conte o que aconteceu</h2><p className="muted">Quanto mais contexto, mais rápido conseguiremos ajudar.</p></div>
                <button className="support-icon-button" type="button" onClick={() => setCreating(false)} aria-label="Fechar"><X /></button>
              </div>
              <fieldset className="support-category-fieldset">
                <legend>Qual é o assunto?</legend>
                <div className="support-category-grid">
                  {categories.map(([value, label, hint]) => (
                    <label className={category === value ? 'selected' : ''} key={value}>
                      <input type="radio" name="category" value={value} checked={category === value} onChange={() => setCategory(value)} required />
                      <span><strong>{label}</strong><small>{hint}</small></span><ChevronRight />
                    </label>
                  ))}
                </div>
              </fieldset>
              <Field>Assunto<input value={subject} onChange={(event) => setSubject(event.target.value)} minLength={6} maxLength={160} placeholder="Resuma o problema em uma frase" required /></Field>
              <Field>Detalhes<textarea value={description} onChange={(event) => setDescription(event.target.value)} minLength={20} rows={7} placeholder="Diga o que você tentou, quando aconteceu e qualquer informação importante..." required /></Field>
              <div className="support-form-footer">
                <Field>Prioridade<select value={priority} onChange={(event) => setPriority(event.target.value)}><option value="low">Baixa — dúvida ou sugestão</option><option value="normal">Normal — preciso de ajuda</option><option value="high">Alta — impede meu acesso ou uso</option><option value="urgent">Urgente — segurança ou pagamento</option></select></Field>
                <Button type="submit" disabled={pending || !category}><Send /> {pending ? 'Abrindo...' : 'Abrir chamado'}</Button>
              </div>
              <p className="support-privacy-note"><ShieldCheck /> Suas informações ficam visíveis apenas para você e para a equipe responsável.</p>
            </form>
          ) : detail.data ? (
            <div className="support-conversation">
              <div className="support-main-head support-conversation-head">
                <button className="support-mobile-back" type="button" onClick={() => setParams({})}><ArrowLeft /></button>
                <div><span className="panel-eyebrow">{detail.data.protocol} · {detail.data.category_label}</span><h2>{detail.data.subject}</h2><div className="support-ticket-meta"><TicketStatus ticket={detail.data} /><span><Clock3 /> Aberto em {formatDateTime(detail.data.created_at, 'short')}</span><span>Atendente: {detail.data.assigned_to}</span></div></div>
                <Button className="ghost compact" type="button" disabled={pending} onClick={() => void ticketAction(detail.data.status === 'closed' ? 'reopen' : 'close')}>{detail.data.status === 'closed' ? 'Reabrir' : 'Encerrar'}</Button>
              </div>
              {detail.data.status === 'waiting_user' ? <div className="support-action-banner"><CircleAlert /><div><strong>A equipe precisa da sua resposta</strong><span>Confira a última mensagem abaixo para o atendimento continuar.</span></div></div> : null}
              <TicketMessages messages={detail.data.messages ?? []} />
              {!['closed', 'resolved'].includes(detail.data.status) ? (
                <form className="support-reply" onSubmit={submitReply}><label><span>Responder à equipe</span><textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={3} placeholder="Escreva sua mensagem..." required /></label><Button type="submit" disabled={pending || !reply.trim()}><Send /> {pending ? 'Enviando...' : 'Enviar'}</Button></form>
              ) : <div className="support-closed-note"><CheckCircle2 /><div><strong>Este atendimento foi finalizado</strong><span>Se o problema continuar, você pode reabrir o chamado.</span></div></div>}
            </div>
          ) : (
            <div className="support-empty"><Sparkles /><h2>Atendimento humano, sem perder o contexto</h2><p>Selecione um chamado ou abra um novo. Todo o histórico fica organizado aqui.</p><Button type="button" onClick={() => setCreating(true)}><Plus /> Abrir chamado</Button></div>
          )}
        </main>
      </div>
    </div>
  )
}
