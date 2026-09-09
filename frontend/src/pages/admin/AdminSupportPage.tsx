import { Card } from '../../components/ui/Card'
import { TicketMessages } from '../../components/support/TicketMessages'
import { apiErrorMessage } from '../../lib/errors'
import { TicketStatus } from '../../components/support/TicketStatus'
import { formatDateTime } from '../../lib/formatters'
import { Button } from '../../components/ui/Button'
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
import { staffSupportApi } from '../../services/api'
import type { ApiSupportTicket } from '../../services/types'

const STATUS_VALUES = ['open', 'in_progress', 'waiting_user', 'waiting_team', 'resolved', 'closed']
const PRIORITY_VALUES = ['low', 'normal', 'high', 'urgent']
const CATEGORY_VALUES = ['technical', 'billing', 'account', 'game', 'bug', 'report', 'suggestion', 'other']

export function AdminSupportPage() {
  const { t } = useTranslation('admin')
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
      toast.success(t('support.toast.updated'))
      await refresh()
    } catch (error) {
      toast.error(apiErrorMessage(error, t('support.toast.updateError')))
    } finally {
      setPending(false)
    }
  }

  async function submitReply(event: FormEvent) {
    event.preventDefault()
    if (!selectedId || !reply.trim() || !selected || ['closed', 'resolved'].includes(selected.status)) return
    setPending(true)
    try {
      await staffSupportApi.reply(selectedId, reply, internal)
      toast.success(internal ? t('support.toast.noteAdded') : t('support.toast.replySent'))
      setReply('')
      setInternal(false)
      await refresh()
    } catch (error) {
      toast.error(apiErrorMessage(error, t('support.toast.replyError')))
    } finally {
      setPending(false)
    }
  }

  const ticketClosed = selected ? ['closed', 'resolved'].includes(selected.status) : false

  function TicketRow({ ticket }: { ticket: ApiSupportTicket }) {
    return (
      <button className={`staff-support-row${selectedId === ticket.id ? ' active' : ''}`} type="button" onClick={() => { setSelectedId(ticket.id); setParams({ ticket: ticket.id }) }}>
        <span className="staff-support-row-flags">
          {ticket.sla_breached ? <b className="sla-breach"><AlertTriangle /> {t('support.slaBreach')}</b> : null}
          <span className={`priority-dot ${ticket.priority}`} title={t('support.priorityTitle', { label: ticket.priority_label })} />
          <small>{ticket.protocol}</small>
          <time>{formatDateTime(ticket.last_activity_at, 'short')}</time>
        </span>
        <strong>{ticket.subject}</strong>
        <span>{ticket.customer?.display_name} · {ticket.category_label}</span>
        <footer><TicketStatus ticket={ticket} /><small>{ticket.assigned_to}</small></footer>
      </button>
    )
  }

  return (
    <div className="staff-support-page">
      <Card as="header" className="staff-support-hero">
        <div>
          <a className="character-back" href="/painel/admin"><ArrowLeft /> {t('support.back')}</a>
          <span className="panel-eyebrow"><Headphones /> {t('support.eyebrow')}</span>
          <h1>{t('support.title')}</h1>
          <p className="muted">{t('support.subtitle')}</p>
        </div>
        <div className="staff-support-live"><i /> {t('support.live')}</div>
      </Card>

      <section className="staff-support-metrics">
        <button type="button" onClick={() => setStatus('open')}><Inbox /><span><b>{queue.data?.summary.open ?? 0}</b> {t('support.metrics.new')}</span></button>
        <button type="button" onClick={() => setStatus('in_progress')}><Users /><span><b>{queue.data?.summary.in_progress ?? 0}</b> {t('support.metrics.inProgress')}</span></button>
        <button type="button" onClick={() => setStatus('waiting_user')}><Clock3 /><span><b>{queue.data?.summary.waiting_user ?? 0}</b> {t('support.metrics.waitingUser')}</span></button>
        <button className="danger" type="button" onClick={() => setStatus('')}><AlertTriangle /><span><b>{queue.data?.summary.sla_breached ?? 0}</b> {t('support.metrics.slaBreached')}</span></button>
        <button type="button" onClick={() => setStatus('')}><UserCheck /><span><b>{queue.data?.summary.unassigned ?? 0}</b> {t('support.metrics.unassigned')}</span></button>
      </section>

      <div className="staff-support-workspace">
        <aside className={`card staff-support-queue${selectedId ? ' has-selection' : ''}`}>
          <div className="staff-support-filters">
            <label><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('support.searchPlaceholder')} /></label>
            <select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">{t('support.allStatuses')}</option>{STATUS_VALUES.map((value) => <option key={value} value={value}>{t(`support.statusLabels.${value}`)}</option>)}</select>
            <select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">{t('support.allCategories')}</option>{CATEGORY_VALUES.map((value) => <option key={value} value={value}>{t(`support.categories.${value}`)}</option>)}</select>
          </div>
          <div className="staff-support-queue-scroll">
            {queueGroups.urgent.length ? <div className="staff-support-section-label"><AlertTriangle /> {t('support.immediatePriority')} <span>{queueGroups.urgent.length}</span></div> : null}
            {queueGroups.urgent.map((ticket) => <TicketRow ticket={ticket} key={ticket.id} />)}
            {queueGroups.regular.length ? <div className="staff-support-section-label"><Inbox /> {t('support.generalQueue')} <span>{queueGroups.regular.length}</span></div> : null}
            {queueGroups.regular.map((ticket) => <TicketRow ticket={ticket} key={ticket.id} />)}
            {!queue.isLoading && !queue.data?.results.length ? <div className="support-empty-mini"><CheckCircle2 /><strong>{t('support.emptyQueueTitle')}</strong><span>{t('support.emptyQueueText')}</span></div> : null}
          </div>
        </aside>

        <main className={`card staff-support-detail${selected ? ' is-open' : ''}`}>
          {selected ? (
            <>
              <header className="staff-ticket-head">
                <button className="support-mobile-back" type="button" onClick={() => { setSelectedId(''); setParams({}) }}><ArrowLeft /></button>
                <div><span className="panel-eyebrow">{selected.protocol}</span><h2>{selected.subject}</h2><p>{selected.customer?.display_name} <small>@{selected.customer?.username} · {selected.customer?.email}</small></p></div>
                <TicketStatus ticket={selected} />
              </header>
              <div className="staff-ticket-controls">
                <label>{t('support.statusField')}<select value={selected.status} disabled={pending} onChange={(event) => void update({ status: event.target.value })}>{STATUS_VALUES.map((value) => <option key={value} value={value}>{t(`support.statusLabels.${value}`)}</option>)}</select></label>
                <label>{t('support.priorityField')}<select value={selected.priority} disabled={pending} onChange={(event) => void update({ priority: event.target.value })}>{PRIORITY_VALUES.map((value) => <option key={value} value={value}>{t(`support.priorityLabels.${value}`)}</option>)}</select></label>
                <Button className="ghost compact" type="button" disabled={pending || selected.assigned_to !== 'Equipe PDL'} onClick={() => void update({ assigned_to: 'me' })}><UserCheck /> {selected.assigned_to === 'Equipe PDL' ? t('support.assign') : selected.assigned_to}</Button>
              </div>
              <div className="staff-ticket-context">
                <span><b>{t('support.contextCategory')}</b>{selected.category_label}</span><span><b>{t('support.contextOpenedAt')}</b>{formatDateTime(selected.created_at, 'short')}</span><span><b>{t('support.contextSla')}</b>{selected.sla_breached ? t('support.slaExpired') : formatDateTime(selected.sla_due_at, 'short')}</span>
              </div>
              <TicketMessages messages={selected.messages ?? []} staff />
              {ticketClosed ? (
                <div className="support-closed-note">
                  <CheckCircle2 />
                  <div>
                    <strong>{t('support.closedTitle')}</strong>
                    <span>{t('support.closedText')}</span>
                  </div>
                  <Button className="ghost compact" type="button" disabled={pending} onClick={() => void update({ status: 'open' })}>{t('support.reopen')}</Button>
                </div>
              ) : (
                <form className={`support-reply staff-reply${internal ? ' internal' : ''}`} onSubmit={submitReply}>
                  <div className="staff-reply-mode"><button type="button" className={!internal ? 'active' : ''} onClick={() => setInternal(false)}>{t('support.replyToPlayer')}</button><button type="button" className={internal ? 'active' : ''} onClick={() => setInternal(true)}>{t('support.internalNote')}</button></div>
                  <label><span>{internal ? t('support.internalHint') : t('support.publicHint')}</span><textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={4} placeholder={internal ? t('support.internalPlaceholder') : t('support.publicPlaceholder')} required /></label>
                  <Button type="submit" disabled={pending || !reply.trim()}><Send /> {pending ? t('support.sending') : internal ? t('support.addNote') : t('support.sendReply')}</Button>
                </form>
              )}
            </>
          ) : <div className="support-empty"><MessageSquareText /><h2>{t('support.emptyTitle')}</h2><p>{t('support.emptyText')}</p></div>}
        </main>
      </div>
    </div>
  )
}
