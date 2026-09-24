import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Coins, Package, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState, ErrorNotice, LoadingState } from '../../components/ui/Feedback'
import { Field } from '../../components/ui/Field'
import { Toggle } from '../../components/ui/Toggle'
import { useFeedbackAction } from '../../hooks/useFeedbackAction'
import { staffApi, type ApiStaffCoinPackage } from '../../services/api'
import { AdminHeader, AdminSaveBar } from './AdminChrome'

const EMPTY: Omit<ApiStaffCoinPackage, 'id'> = {
  code: '',
  name: '',
  coins: '',
  price_brl: '',
  price_usd: '',
  badge: '',
  active: true,
  sort_order: 0,
}

export function AdminCoinPackagesPage() {
  const { t } = useTranslation('admin')
  const queryClient = useQueryClient()
  const packages = useQuery({ queryKey: ['staff-coin-packages'], queryFn: staffApi.coinPackages })
  const [draft, setDraft] = useState<Partial<ApiStaffCoinPackage>>(EMPTY)
  const [editingId, setEditingId] = useState<string | null>(null)
  const action = useFeedbackAction()
  const saving = action.pending
  const rows = packages.data ?? []
  const activeCount = rows.filter((row) => row.active).length

  function reset() {
    setDraft({ ...EMPTY })
    setEditingId(null)
  }

  function open(row: ApiStaffCoinPackage) {
    setEditingId(row.id)
    setDraft({ ...row })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function startNew() {
    reset()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['staff-coin-packages'] })
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    await action.run(async () => {
      await staffApi.saveCoinPackage({
        id: editingId || undefined,
        code: draft.code,
        name: draft.name,
        coins: draft.coins,
        price_brl: draft.price_brl,
        price_usd: draft.price_usd,
        badge: draft.badge,
        active: draft.active ?? true,
        sort_order: Number(draft.sort_order ?? 0),
      })
      toast.success(editingId ? t('coinPackages.toast.updated') : t('coinPackages.toast.created'))
      reset()
      await refresh()
    }, t('coinPackages.toast.error'))
  }

  async function remove(row: ApiStaffCoinPackage) {
    if (!window.confirm(t('coinPackages.confirmRemove', { name: row.name }))) return
    await action.run(async () => {
      await staffApi.deleteCoinPackage(row.id)
      toast.success(t('coinPackages.toast.removed'))
      if (editingId === row.id) reset()
      await refresh()
    }, t('coinPackages.toast.error'))
  }

  return (
    <div className="account-page">
      <AdminHeader
        kicker={t('coinPackages.kicker')}
        title={t('coinPackages.title')}
        description={t('coinPackages.description')}
      />
      <ErrorNotice error={packages.error} />

      <Card className="admin-game-panel">
        <header className="admin-services-heading">
          <span><Package /></span>
          <div>
            <span className="panel-eyebrow">{t('coinPackages.eyebrow')}</span>
            <h2>{t('coinPackages.panelTitle')}</h2>
            <p>{t('coinPackages.panelText')}</p>
          </div>
          <div className="admin-services-summary">
            <strong>{activeCount}</strong>
            <small>{t('coinPackages.activeCount', { total: rows.length })}</small>
          </div>
        </header>
      </Card>

      <form className="admin-coins-form" onSubmit={onSubmit}>
        <Card className="admin-config-section admin-coin-identity">
          <header>
            <span><Coins /></span>
            <div>
              <span className="panel-eyebrow">{editingId ? t('coinPackages.editingEyebrow') : t('coinPackages.createEyebrow')}</span>
              <h2>{editingId ? t('coinPackages.editingTitle', { name: draft.name || '—' }) : t('coinPackages.createTitle')}</h2>
              <p>{t('coinPackages.formText')}</p>
            </div>
          </header>

          <div className="account-form-fields">
            <Field>
              {t('coinPackages.name')}
              <input
                value={draft.name ?? ''}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                required
                maxLength={80}
                placeholder={t('coinPackages.namePlaceholder')}
              />
            </Field>
            <Field>
              {t('coinPackages.code')}
              <input
                value={draft.code ?? ''}
                onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))}
                required
                maxLength={40}
                placeholder="plus"
              />
              <small>{t('coinPackages.codeHint')}</small>
            </Field>
            <Field>
              {t('coinPackages.badge')}
              <input
                value={draft.badge ?? ''}
                onChange={(event) => setDraft((current) => ({ ...current, badge: event.target.value }))}
                maxLength={40}
                placeholder={t('coinPackages.badgePlaceholder')}
              />
            </Field>
            <Field>
              {t('coinPackages.sortOrder')}
              <input
                type="number"
                min="0"
                step="1"
                value={draft.sort_order ?? 0}
                onChange={(event) => setDraft((current) => ({ ...current, sort_order: Number(event.target.value) }))}
              />
            </Field>
          </div>

          <div className="admin-coin-packages-metrics">
            <Field className="card admin-coin-metric">
              <span className="admin-coin-metric-icon"><Coins aria-hidden="true" /></span>
              <span>
                <b>{t('coinPackages.coins')}</b>
                <small>{t('coinPackages.coinsHint')}</small>
              </span>
              <span className="admin-coin-input">
                <b>×</b>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={draft.coins ?? ''}
                  onChange={(event) => setDraft((current) => ({ ...current, coins: event.target.value }))}
                  required
                />
              </span>
            </Field>
            <Field className="card admin-coin-metric">
              <span className="admin-coin-metric-icon"><span aria-hidden="true">R$</span></span>
              <span>
                <b>{t('coinPackages.priceBrl')}</b>
                <small>{t('coinPackages.priceBrlHint')}</small>
              </span>
              <span className="admin-coin-input">
                <b>R$</b>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.price_brl ?? ''}
                  onChange={(event) => setDraft((current) => ({ ...current, price_brl: event.target.value }))}
                  required
                />
              </span>
            </Field>
            <Field className="card admin-coin-metric">
              <span className="admin-coin-metric-icon"><span aria-hidden="true">$</span></span>
              <span>
                <b>{t('coinPackages.priceUsd')}</b>
                <small>{t('coinPackages.priceUsdHint')}</small>
              </span>
              <span className="admin-coin-input">
                <b>$</b>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.price_usd ?? ''}
                  onChange={(event) => setDraft((current) => ({ ...current, price_usd: event.target.value }))}
                  required
                />
              </span>
            </Field>
          </div>

          <Toggle
            label={t('coinPackages.active')}
            checked={Boolean(draft.active)}
            onChange={(event) => setDraft((current) => ({ ...current, active: event.target.checked }))}
          />
        </Card>

        <Card as="div" className="admin-server-actions">
          <span>
            <strong>{editingId ? t('coinPackages.updateHint') : t('coinPackages.createHint')}</strong>
            <small>{t('coinPackages.actionsHint')}</small>
          </span>
          <div className="admin-cms-actions">
            <AdminSaveBar saving={saving} label={editingId ? t('coinPackages.update') : t('coinPackages.create')} />
            {editingId ? (
              <Button className="ghost" type="button" onClick={reset}>{t('chrome.cancelEdit')}</Button>
            ) : null}
          </div>
        </Card>
      </form>

      {packages.isLoading ? <LoadingState label={t('coinPackages.loading')} /> : null}

      {!packages.isLoading ? (
        <Card className="admin-coin-packages-catalog">
          <div className="account-section-heading">
            <div>
              <span className="panel-eyebrow">{t('coinPackages.listEyebrow')}</span>
              <h2>{t('coinPackages.listTitle')}</h2>
              <p className="muted">{t('coinPackages.listText')}</p>
            </div>
            <Button type="button" className="ghost" onClick={startNew}>
              <Plus aria-hidden="true" /> {t('coinPackages.newPackage')}
            </Button>
          </div>

          {rows.length === 0 ? (
            <EmptyState title={t('coinPackages.emptyTitle')} description={t('coinPackages.emptyText')} />
          ) : (
            <div className="admin-coin-packages-grid">
              {rows.map((row) => {
                const featured = Boolean(row.badge)
                const editing = editingId === row.id
                return (
                  <article
                    key={row.id}
                    className={[
                      'admin-coin-package-card',
                      featured ? 'is-featured' : '',
                      row.active ? 'is-active' : 'is-inactive',
                      editing ? 'is-editing' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    {row.badge ? (
                      <span className="pay-pack-badge">
                        <Sparkles aria-hidden="true" /> {row.badge}
                      </span>
                    ) : (
                      <span className="admin-coin-package-card-spacer" aria-hidden="true" />
                    )}
                    <span className="pay-pack-name">{row.name}</span>
                    <code>{row.code}</code>
                    <span className="pay-pack-coins">
                      <Coins aria-hidden="true" /> {row.coins}
                    </span>
                    <div className="admin-coin-package-prices">
                      <strong>R$ {row.price_brl}</strong>
                      <span>$ {row.price_usd}</span>
                    </div>
                    <div className="admin-coin-package-meta">
                      <span className={`account-status-pill${row.active ? ' is-active' : ''}`}>
                        {row.active ? t('coinPackages.activeLabel') : t('coinPackages.inactive')}
                      </span>
                      <small>{t('coinPackages.orderLabel', { order: row.sort_order })}</small>
                    </div>
                    <div className="admin-coin-package-actions">
                      <Button type="button" size="sm" className="ghost" onClick={() => open(row)}>
                        <Pencil aria-hidden="true" /> {t('chrome.edit')}
                      </Button>
                      <Button type="button" size="sm" variant="danger" onClick={() => void remove(row)} disabled={saving}>
                        <Trash2 aria-hidden="true" /> {t('chrome.delete')}
                      </Button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </Card>
      ) : null}
    </div>
  )
}
