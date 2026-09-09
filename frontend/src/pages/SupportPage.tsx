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
import { useTranslation } from 'react-i18next'
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

const categories = ['technical', 'billing', 'account', 'game', 'bug', 'report', 'suggestion', 'other'] as const

export function SupportPage() {
  const { t } = useTranslation('panel')
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
    return screen ? t('support.prefillSubject', { title: screen.title }) : ''
  })
  const [description, setDescription] = useState(() => {
    const screen = getHelpContext(prefillFrom)
    return screen ? t('support.prefillDescription', { title: screen.title, path: screen.path }) : ''
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
      toast.success(t('support.ticketOpened', { protocol: ticket.protocol }))
      setSubject('')
      setDescription('')
      setCategory('')
      setPriority('normal')
      setCreating(false)
      setParams({ ticket: ticket.id })
      await refresh(ticket.id)
    } catch (error) {
      toast.error(apiErrorMessage(error, t('support.createError')))
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
      toast.success(t('support.replySent'))
      await refresh(selectedId)
    } catch (error) {
      toast.error(apiErrorMessage(error, t('support.replyError')))
    } finally {
      setPending(false)
    }
  }

  async function ticketAction(action: 'close' | 'reopen') {
    if (!selectedId) return
    setPending(true)
    try {
      await supportApi.action(selectedId, action)
      toast.success(action === 'close' ? t('support.ticketClosed') : t('support.ticketReopened'))
      await refresh(selectedId)
    } catch (error) {
      toast.error(apiErrorMessage(error, t('support.actionError')))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="support-page">
      <Card as="header" className="support-hero">
        <div>
          <span className="panel-eyebrow"><Headphones aria-hidden="true" /> {t('support.eyebrow')}</span>
          <h1>{t('support.title')}</h1>
          <p className="muted">{t('support.subtitle')}</p>
        </div>
        <Button className="support-new-button" type="button" onClick={() => { setCreating(true); setParams({}) }}>
          <Plus aria-hidden="true" /> {t('support.newTicket')}
        </Button>
      </Card>

      <section className="support-overview" aria-label={t('support.overviewAria')}>
        <div className="support-stat"><LifeBuoy /><span><strong>{list.data?.summary.active ?? 0}</strong> {t('support.statActive')}</span></div>
        <div className="support-stat attention"><CircleAlert /><span><strong>{list.data?.summary.waiting_user ?? 0}</strong> {t('support.statWaiting')}</span></div>
        <div className="support-stat done"><CheckCircle2 /><span><strong>{list.data?.summary.resolved ?? 0}</strong> {t('support.statResolved')}</span></div>
      </section>

      <div className="support-workspace">
        <aside className={`card support-inbox${creating ? ' is-mobile-hidden' : ''}`}>
          <div className="support-inbox-head">
            <div><span className="panel-eyebrow">{t('support.inboxEyebrow')}</span><h2>{t('support.inboxTitle')}</h2></div>
            <button type="button" aria-label={t('support.newTicket')} onClick={() => { setCreating(true); setParams({}) }}><Plus /></button>
          </div>
          <div className="support-filter-tabs">
            <button className={filter === 'active' ? 'active' : ''} type="button" onClick={() => setFilter('active')}>{t('support.filterActive')}</button>
            <button className={filter === 'all' ? 'active' : ''} type="button" onClick={() => setFilter('all')}>{t('support.filterAll')}</button>
            <button className={filter === 'closed' ? 'active' : ''} type="button" onClick={() => setFilter('closed')}>{t('support.filterClosed')}</button>
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
                <span className="support-ticket-row-bottom"><TicketStatus ticket={ticket} /><small>{t('support.messagesCount', { total: ticket.message_count ?? 0 })}</small></span>
              </button>
            ))}
            {!list.isLoading && !tickets.length ? (
              <div className="support-empty-mini"><MessageSquareText /><strong>{t('support.emptyInboxTitle')}</strong><span>{t('support.emptyInboxText')}</span></div>
            ) : null}
          </div>
        </aside>

        <main className={`card support-main${creating || selectedId ? ' is-open' : ''}`}>
          {creating ? (
            <form className="support-create" onSubmit={submitTicket}>
              <div className="support-main-head">
                <div><span className="panel-eyebrow">{t('support.createEyebrow')}</span><h2>{t('support.createTitle')}</h2><p className="muted">{t('support.createHint')}</p></div>
                <button className="support-icon-button" type="button" onClick={() => setCreating(false)} aria-label={t('support.closeForm')}><X /></button>
              </div>
              <fieldset className="support-category-fieldset">
                <legend>{t('support.categoryLegend')}</legend>
                <div className="support-category-grid">
                  {categories.map((value) => (
                    <label className={category === value ? 'selected' : ''} key={value}>
                      <input type="radio" name="category" value={value} checked={category === value} onChange={() => setCategory(value)} required />
                      <span><strong>{t(`support.categories.${value}.label`)}</strong><small>{t(`support.categories.${value}.hint`)}</small></span><ChevronRight />
                    </label>
                  ))}
                </div>
              </fieldset>
              <Field>{t('support.subject')}<input value={subject} onChange={(event) => setSubject(event.target.value)} minLength={6} maxLength={160} placeholder={t('support.subjectPlaceholder')} required /></Field>
              <Field>{t('support.details')}<textarea value={description} onChange={(event) => setDescription(event.target.value)} minLength={20} rows={7} placeholder={t('support.detailsPlaceholder')} required /></Field>
              <div className="support-form-footer">
                <Field>{t('support.priority')}<select value={priority} onChange={(event) => setPriority(event.target.value)}><option value="low">{t('support.priorityLow')}</option><option value="normal">{t('support.priorityNormal')}</option><option value="high">{t('support.priorityHigh')}</option><option value="urgent">{t('support.priorityUrgent')}</option></select></Field>
                <Button type="submit" disabled={pending || !category}><Send /> {pending ? t('support.opening') : t('support.openTicket')}</Button>
              </div>
              <p className="support-privacy-note"><ShieldCheck /> {t('support.privacyNote')}</p>
            </form>
          ) : detail.data ? (
            <div className="support-conversation">
              <div className="support-main-head support-conversation-head">
                <button className="support-mobile-back" type="button" onClick={() => setParams({})}><ArrowLeft /></button>
                <div><span className="panel-eyebrow">{detail.data.protocol} · {detail.data.category_label}</span><h2>{detail.data.subject}</h2><div className="support-ticket-meta"><TicketStatus ticket={detail.data} /><span><Clock3 /> {t('support.openedAt', { when: formatDateTime(detail.data.created_at, 'short') })}</span><span>{t('support.assignedTo', { name: detail.data.assigned_to })}</span></div></div>
                <Button className="ghost compact" type="button" disabled={pending} onClick={() => void ticketAction(['closed', 'resolved'].includes(detail.data.status) ? 'reopen' : 'close')}>{['closed', 'resolved'].includes(detail.data.status) ? t('support.reopen') : t('support.closeTicket')}</Button>
              </div>
              {detail.data.status === 'waiting_user' ? <div className="support-action-banner"><CircleAlert /><div><strong>{t('support.waitingTitle')}</strong><span>{t('support.waitingText')}</span></div></div> : null}
              <TicketMessages messages={detail.data.messages ?? []} />
              {!['closed', 'resolved'].includes(detail.data.status) ? (
                <form className="support-reply" onSubmit={submitReply}><label><span>{t('support.replyLabel')}</span><textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={3} placeholder={t('support.replyPlaceholder')} required /></label><Button type="submit" disabled={pending || !reply.trim()}><Send /> {pending ? t('support.sending') : t('support.send')}</Button></form>
              ) : <div className="support-closed-note"><CheckCircle2 /><div><strong>{t('support.closedTitle')}</strong><span>{t('support.closedText')}</span></div></div>}
            </div>
          ) : (
            <div className="support-empty"><Sparkles /><h2>{t('support.emptyTitle')}</h2><p>{t('support.emptyText')}</p><Button type="button" onClick={() => setCreating(true)}><Plus /> {t('support.openTicket')}</Button></div>
          )}
        </main>
      </div>
    </div>
  )
}
