import { useMemo, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { Gavel, Search } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { Select } from '../../components/ui/Select'
import { EmptyState, ErrorNotice, LoadingState } from '../../components/ui/Feedback'
import { Pagination } from '../../components/ui/Pagination'
import { apiErrorMessage } from '../../lib/errors'
import { useFeedbackAction } from '../../hooks/useFeedbackAction'
import {
  staffModerationApi,
  type ApiModerationCharacter,
  type ModerationAction,
  type ModerationStatus,
} from '../../services/api'
import { AdminHeader } from './AdminChrome'
import { ModerationCharacterDetail } from '../../components/admin/moderation/ModerationCharacterDetail'
import { ModerationCharacterList } from '../../components/admin/moderation/ModerationCharacterList'
import { ModerationActionModal } from '../../components/admin/moderation/ModerationActionModal'

const KEY = ['staff-moderation'] as const

export function AdminModerationPage() {
  const { t } = useTranslation('admin')
  const client = useQueryClient()
  const action = useFeedbackAction()
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [status, setStatus] = useState<ModerationStatus>('all')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [pending, setPending] = useState<ModerationAction | null>(null)

  const list = useQuery({
    queryKey: [...KEY, 'list', submitted, status, page],
    queryFn: () => staffModerationApi.characters(submitted, status, page),
    retry: false,
  })
  const detail = useQuery({
    queryKey: [...KEY, 'character', selectedId],
    queryFn: () => staffModerationApi.character(selectedId as number),
    enabled: selectedId != null,
    retry: false,
  })

  const towns = detail.data?.towns ?? list.data?.towns ?? []
  const selected = detail.data ?? list.data?.results.find((row) => row.char_id === selectedId) ?? null
  const statusOptions = useMemo(
    () =>
      (['all', 'online', 'offline', 'banned', 'jailed'] as const).map((value) => ({
        value,
        label: t(`moderation.filters.${value}`),
      })),
    [t],
  )

  function onSearch(event: FormEvent) {
    event.preventDefault()
    setPage(1)
    setSubmitted(query.trim())
  }

  async function onAct(payload: { reason: string; minutes: number; town: string }) {
    if (!selected || !pending) return
    const result = await action.run(
      () =>
        staffModerationApi.act({
          action: pending,
          char_id: selected.char_id,
          reason: payload.reason,
          minutes: pending === 'jail' ? payload.minutes : undefined,
          town: pending === 'teleport' ? payload.town : undefined,
        }),
      t('moderation.toast.actionError'),
    )
    if (!result.ok) return
    toast.success(
      result.value.was_online
        ? `${t(`moderation.toast.${pending}`)} ${t('moderation.toast.onlinePending')}`
        : t(`moderation.toast.${pending}`),
    )
    setPending(null)
    await client.invalidateQueries({ queryKey: KEY })
  }

  return (
    <div className="account-page admin-moderation-page">
      <AdminHeader
        kicker={t('moderation.kicker')}
        title={t('moderation.title')}
        description={t('moderation.description')}
      />

      <Card className="admin-moderation-panel">
        <header className="admin-services-heading">
          <span><Search /></span>
          <div>
            <span className="panel-eyebrow">{t('moderation.eyebrow')}</span>
            <h2>{t('moderation.searchTitle')}</h2>
            <p>{t('moderation.searchText')}</p>
          </div>
        </header>
        <form className="admin-moderation-search" onSubmit={onSearch}>
          <Field label={t('moderation.queryLabel')}>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              maxLength={45}
              autoComplete="off"
              spellCheck={false}
              placeholder={t('moderation.queryPlaceholder')}
            />
          </Field>
          <Field label={t('moderation.statusLabel')}>
            <Select
              value={status}
              options={statusOptions}
              onChange={(value) => {
                setStatus(value as ModerationStatus)
                setPage(1)
              }}
              aria-label={t('moderation.statusLabel')}
            />
          </Field>
          <Button type="submit" disabled={list.isFetching}>
            {list.isFetching ? t('moderation.searching') : t('moderation.search')}
          </Button>
        </form>
      </Card>

      {list.isError ? (
        <ErrorNotice error={list.error} fallback={t('moderation.toast.listError')} onRetry={() => void list.refetch()} />
      ) : null}
      {list.isPending ? <LoadingState>{t('moderation.loading')}</LoadingState> : null}
      {list.data && !list.data.available ? (
        <EmptyState icon={<Gavel />}>{t('moderation.unavailable')}</EmptyState>
      ) : null}

      {list.data?.available ? (
        <div className="admin-moderation-layout">
          <Card className="admin-moderation-list">
            <ModerationCharacterList
              rows={list.data.results}
              selectedId={selectedId}
              onSelect={(row: ApiModerationCharacter) => setSelectedId(row.char_id)}
            />
            {list.data.results.length === 0 ? <EmptyState>{t('moderation.empty')}</EmptyState> : null}
            {list.data.pages > 1 ? (
              <Pagination
                page={list.data.page}
                pages={list.data.pages}
                onChange={setPage}
                busy={list.isFetching}
              />
            ) : null}
          </Card>
          <Card className="admin-moderation-detail">
            {selectedId == null ? (
              <EmptyState>{t('moderation.pick')}</EmptyState>
            ) : detail.isError ? (
              <ErrorNotice error={detail.error} fallback={t('moderation.toast.detailError')} onRetry={() => void detail.refetch()} />
            ) : detail.isPending && !selected ? (
              <LoadingState>{t('moderation.loadingDetail')}</LoadingState>
            ) : selected ? (
              <ModerationCharacterDetail
                character={selected}
                busy={action.pending}
                onAction={setPending}
              />
            ) : null}
          </Card>
        </div>
      ) : null}

      <ModerationActionModal
        key={pending ?? 'closed'}
        action={pending}
        character={selected}
        towns={towns}
        busy={action.pending}
        onClose={() => { if (!action.pending) setPending(null) }}
        onConfirm={onAct}
      />
    </div>
  )
}
