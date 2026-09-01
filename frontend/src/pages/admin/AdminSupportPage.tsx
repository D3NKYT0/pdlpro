import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Headphones,
  Inbox,
  MessageSquareText,
  Search,
  Send,
  UserCheck,
  Users,
} from 'lucide-react'
import { isApiError, staffSupportApi } from '../../services/api'
import type { ApiSupportTicket } from '../../services/types'

const statusLabels: Record<string, string> = {
  open: 'Aberto', in_progress: 'Em atendimento', waiting_user: 'Aguardando jogador',
  waiting_team: 'Aguardando equipe', resolved: 'Resolvido', closed: 'Fechado',
}
const priorityLabels: Record<string, string> = { low: 'Baixa', normal: 'Normal', high: 'Alta', urgent: 'Urgente' }

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function Status({ ticket }: { ticket: ApiSupportTicket }) {
  const tone = ticket.status === 'waiting_user' ? 'attention' : ['resolved', 'closed'].includes(ticket.status) ? 'done' : ticket.status === 'open' ? 'new' : 'progress'
  return <span className={`support-status ${tone}`}>{ticket.status_label}</span>
}

export function AdminSupportPage() {
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(params.get('ticket') ?? '')
  const [reply, setReply] = useState('')
  const [internal, setInternal] = useState(false)
  const [pending, setPending] = useState(false)
  const queue = useQuery({
    queryKey: ['staff-support', status, category, search],
    queryFn: () => staffSupportApi.list({ status, category, q: search }),
  })
  const detail = useQuery({
    queryKey: ['staff-support-ticket', selectedId],
    queryFn: () => staffSupportApi.detail(selectedId),
    enabled: Boolean(selectedId),
  })
  const selected = detail.data

  const queueGroups = useMemo(() => ({
    urgent: (queue.data?.results ?? []).filter((row) => row.priority === 'urgent' || row.sla_breached),
    regular: (queue.data?.results ?? []).filter((row) => row.priority !== 'urgent' && !row.sla_breached),
  }), [queue.data?.results])

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['staff-support'] })
    if (selectedId) await queryClient.invalidateQueries({ queryKey: ['staff-support-ticket', selectedId] })
  }

  async function update(payload: { status?: string; priority?: string; assigned_to?: string | null }) {
    if (!selectedId) return
    setPending(true)
    try {
      await staffSupportApi.update(selectedId, payload)
      toast.success('Chamado atualizado')
      await refresh()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível atualizar')
    } finally {
      setPending(false)
    }
  }

  async function submitReply(event: FormEvent) {
    event.preventDefault()
    if (!selectedId || !reply.trim()) return
    setPending(true)
    try {
      await staffSupportApi.reply(selectedId, reply, internal)
      toast.success(internal ? 'Nota interna adicionada' : 'Resposta enviada ao jogador')
      setReply('')
      setInternal(false)
      await refresh()
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Não foi possível responder')
    } finally {
      setPending(false)
    }
  }

  function TicketRow({ ticket }: { ticket: ApiSupportTicket }) {
    return (
      <button className={`staff-support-row${selectedId === ticket.id ? ' active' : ''}`} type="button" onClick={() => { setSelectedId(ticket.id); setParams({ ticket: ticket.id }) }}>
        <span className="staff-support-row-flags">
          {ticket.sla_breached ? <b className="sla-breach"><AlertTriangle /> SLA vencido</b> : null}
          <span className={`priority-dot ${ticket.priority}`} title={`Prioridade ${ticket.priority_label}`} />
          <small>{ticket.protocol}</small>
          <time>{formatDate(ticket.last_activity_at)}</time>
        </span>
        <strong>{ticket.subject}</strong>
        <span>{ticket.customer?.display_name} · {ticket.category_label}</span>
        <footer><Status ticket={ticket} /><small>{ticket.assigned_to}</small></footer>
      </button>
    )
  }

  return (
    <div className="staff-support-page">
      <header className="card staff-support-hero">
        <div>
          <a className="character-back" href="/painel/admin"><ArrowLeft /> Central</a>
          <span className="panel-eyebrow"><Headphones /> Operação de atendimento</span>
          <h1>Fila de chamados</h1>
          <p className="muted">Priorize, assuma e resolva sem perder o histórico do jogador.</p>
        </div>
        <div className="staff-support-live"><i /> Operação online</div>
      </header>

      <section className="staff-support-metrics">
        <button type="button" onClick={() => setStatus('open')}><Inbox /><span><b>{queue.data?.summary.open ?? 0}</b> novos</span></button>
        <button type="button" onClick={() => setStatus('in_progress')}><Users /><span><b>{queue.data?.summary.in_progress ?? 0}</b> em atendimento</span></button>
        <button type="button" onClick={() => setStatus('waiting_user')}><Clock3 /><span><b>{queue.data?.summary.waiting_user ?? 0}</b> aguardando jogador</span></button>
        <button className="danger" type="button" onClick={() => setStatus('')}><AlertTriangle /><span><b>{queue.data?.summary.sla_breached ?? 0}</b> fora do SLA</span></button>
        <button type="button" onClick={() => setStatus('')}><UserCheck /><span><b>{queue.data?.summary.unassigned ?? 0}</b> sem responsável</span></button>
      </section>

      <div className="staff-support-workspace">
        <aside className={`card staff-support-queue${selectedId ? ' has-selection' : ''}`}>
          <div className="staff-support-filters">
            <label><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Protocolo, assunto ou jogador" /></label>
            <select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos os status</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Todas as categorias</option><option value="technical">Técnico</option><option value="billing">Pagamento</option><option value="account">Conta</option><option value="game">Jogo</option><option value="bug">Bug</option><option value="report">Denúncia</option><option value="suggestion">Sugestão</option><option value="other">Outros</option></select>
          </div>
          <div className="staff-support-queue-scroll">
            {queueGroups.urgent.length ? <div className="staff-support-section-label"><AlertTriangle /> Prioridade imediata <span>{queueGroups.urgent.length}</span></div> : null}
            {queueGroups.urgent.map((ticket) => <TicketRow ticket={ticket} key={ticket.id} />)}
            {queueGroups.regular.length ? <div className="staff-support-section-label"><Inbox /> Fila geral <span>{queueGroups.regular.length}</span></div> : null}
            {queueGroups.regular.map((ticket) => <TicketRow ticket={ticket} key={ticket.id} />)}
            {!queue.isLoading && !queue.data?.results.length ? <div className="support-empty-mini"><CheckCircle2 /><strong>Fila limpa</strong><span>Nenhum chamado corresponde aos filtros.</span></div> : null}
          </div>
        </aside>

        <main className={`card staff-support-detail${selected ? ' is-open' : ''}`}>
          {selected ? (
            <>
              <header className="staff-ticket-head">
                <button className="support-mobile-back" type="button" onClick={() => { setSelectedId(''); setParams({}) }}><ArrowLeft /></button>
                <div><span className="panel-eyebrow">{selected.protocol}</span><h2>{selected.subject}</h2><p>{selected.customer?.display_name} <small>@{selected.customer?.username} · {selected.customer?.email}</small></p></div>
                <Status ticket={selected} />
              </header>
              <div className="staff-ticket-controls">
                <label>Status<select value={selected.status} disabled={pending} onChange={(event) => void update({ status: event.target.value })}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label>Prioridade<select value={selected.priority} disabled={pending} onChange={(event) => void update({ priority: event.target.value })}>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <button className="btn ghost compact" type="button" disabled={pending || selected.assigned_to !== 'Equipe PDL'} onClick={() => void update({ assigned_to: 'me' })}><UserCheck /> {selected.assigned_to === 'Equipe PDL' ? 'Assumir chamado' : selected.assigned_to}</button>
              </div>
              <div className="staff-ticket-context">
                <span><b>Categoria</b>{selected.category_label}</span><span><b>Aberto em</b>{formatDate(selected.created_at)}</span><span><b>SLA inicial</b>{selected.sla_breached ? 'Vencido' : formatDate(selected.sla_due_at)}</span>
              </div>
              <div className="support-message-list staff-messages">
                {(selected.messages ?? []).map((message) => (
                  <article className={`support-message ${message.is_staff_reply ? 'staff' : 'player'}${message.is_internal ? ' internal' : ''}`} key={message.id}>
                    <div className="support-message-avatar">{message.is_staff_reply ? <Headphones /> : message.author_name.slice(0, 1)}</div>
                    <div><header><strong>{message.author_name}{message.is_internal ? ' · nota interna' : ''}</strong><time>{formatDate(message.created_at)}</time></header><p>{message.body}</p></div>
                  </article>
                ))}
              </div>
              <form className={`support-reply staff-reply${internal ? ' internal' : ''}`} onSubmit={submitReply}>
                <div className="staff-reply-mode"><button type="button" className={!internal ? 'active' : ''} onClick={() => setInternal(false)}>Resposta ao jogador</button><button type="button" className={internal ? 'active' : ''} onClick={() => setInternal(true)}>Nota interna</button></div>
                <label><span>{internal ? 'Somente a equipe verá esta nota' : 'O jogador receberá uma notificação'}</span><textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={4} placeholder={internal ? 'Contexto para outros atendentes...' : 'Escreva uma resposta clara e objetiva...'} required /></label>
                <button className="btn" type="submit" disabled={pending || !reply.trim()}><Send /> {pending ? 'Enviando...' : internal ? 'Adicionar nota' : 'Enviar resposta'}</button>
              </form>
            </>
          ) : <div className="support-empty"><MessageSquareText /><h2>Selecione um chamado</h2><p>Os casos urgentes e fora do SLA aparecem primeiro.</p></div>}
        </main>
      </div>
    </div>
  )
}
